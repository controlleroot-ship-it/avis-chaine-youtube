import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/deploy-hostinger.sh', import.meta.url));

test('Une configuration absente bloque le déploiement avant toute connexion', () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('HOSTINGER_')) delete env[key];
  const result = spawnSync('bash', [script], { env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Configuration manquante : HOSTINGER_SSH_HOST/);
});

test('Un chemin dangereux bloque le déploiement sans afficher la clé privée', () => {
  const result = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env, HOSTINGER_SSH_HOST: 'example.com', HOSTINGER_SSH_USER: 'u123456789',
      HOSTINGER_SSH_KEY: 'SECRET-NE-PAS-AFFICHER', HOSTINGER_SSH_KNOWN_HOSTS: 'test',
      HOSTINGER_PUBLIC_PATH: '/home/u123456789/../public_html', HOSTINGER_SITE_URL: 'https://example.com',
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Chemin public_html invalide/);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET-NE-PAS-AFFICHER/);
});

test('Un refus SSH bloque le transfert et supprime la clé temporaire', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'avis-deploy-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const commands = join(directory, 'commands');
  await mkdir(commands);
  await mkdir(join(directory, 'hostinger-site', 'api'), { recursive: true });
  for (const file of ['index.html', 'api/index.php', '.htaccess', 'release.json']) {
    await writeFile(join(directory, 'hostinger-site', file), 'test');
  }
  const keyPath = join(directory, 'test-key');
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', keyPath]);
  await writeFile(join(commands, 'ssh'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$SSH_TEST_ARGUMENTS"\nexit 255\n', { mode: 0o755 });
  await writeFile(join(commands, 'rsync'), '#!/usr/bin/env bash\ntouch "$SSH_TEST_TRANSFER"\n', { mode: 0o755 });
  const result = spawnSync('bash', [script], {
    cwd: directory, encoding: 'utf8',
    env: {
      ...process.env, PATH: `${commands}:${process.env.PATH}`, HOSTINGER_SSH_HOST: 'example.com',
      HOSTINGER_SSH_USER: 'u123456789', HOSTINGER_SSH_KEY: await readFile(keyPath, 'utf8'),
      HOSTINGER_SSH_KNOWN_HOSTS: 'example.com ssh-ed25519 TEST', HOSTINGER_SSH_PORT: '65002',
      HOSTINGER_PUBLIC_PATH: '/home/u123456789/domains/example.com/public_html',
      HOSTINGER_SITE_URL: 'https://example.com', SSH_TEST_ARGUMENTS: join(directory, 'arguments'),
      SSH_TEST_TRANSFER: join(directory, 'transferred'),
    },
  });
  assert.equal(result.status, 255);
  const argumentsList = (await readFile(join(directory, 'arguments'), 'utf8')).trim().split('\n');
  assert.ok(argumentsList.includes('StrictHostKeyChecking=yes'));
  await assert.rejects(readFile(join(directory, 'transferred')), { code: 'ENOENT' });
  const temporaryKey = argumentsList[argumentsList.indexOf('-i') + 1];
  await assert.rejects(readFile(temporaryKey), { code: 'ENOENT' });
  assert.doesNotMatch(result.stdout + result.stderr, /BEGIN OPENSSH PRIVATE KEY/);
});
