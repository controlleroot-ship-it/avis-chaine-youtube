import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

async function startApi(t, { production = false, config } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'avis-api-test-'));
  const configPath = join(directory, 'database.php');
  if (config) await writeFile(configPath, config);
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const env = { ...process.env, TMPDIR: directory, AVIS_DB_CONFIG: configPath };
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) delete env[key];
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, production ? 'api/index.php' : 'api/router.php'], {
    cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let logs = '';
  child.stderr.on('data', (chunk) => { logs += chunk; });
  const done = once(child, 'exit');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await done;
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(`${url}/health`);
      return { url, directory };
    } catch {
      if (child.exitCode !== null) throw new Error(`PHP ne démarre pas : ${logs}`);
      await delay(20);
    }
  }
  throw new Error(`PHP ne répond pas : ${logs}`);
}

test('Le stockage de développement conserve un avis après plusieurs requêtes', async (t) => {
  const { url, directory } = await startApi(t);
  const review = { name: 'Camille', rating: 4, message: 'Un avis de test' };
  const created = await fetch(`${url}/api/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review),
  });
  assert.equal(created.status, 201);
  const saved = await created.json();
  const listed = await fetch(`${url}/api/reviews`);
  assert.deepEqual(await listed.json(), [saved]);
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'avis-communaute-reviews.json'), 'utf8')), [saved]);
  assert.equal((await fetch(`${url}/health`)).status, 200);
});

test('La production sans MySQL refuse lecture, écriture et contrôle de santé', async (t) => {
  const { url, directory } = await startApi(t, { production: true });
  for (const [path, options] of [
    ['/health', {}],
    ['/api/reviews', {}],
    ['/api/reviews', { method: 'POST', body: JSON.stringify({ name: 'Test', rating: 5, message: 'Avis' }) }],
  ]) {
    const response = await fetch(url + path, options);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Le service est momentanément indisponible.' });
  }
  await assert.rejects(readFile(join(directory, 'avis-communaute-reviews.json')), { code: 'ENOENT' });
});

test('Une configuration PHP privée invalide produit une erreur sans divulgation', async (t) => {
  const { url } = await startApi(t, { production: true, config: "<?php return 'secret-de-test';" });
  const response = await fetch(`${url}/api/reviews`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Le service est momentanément indisponible.' });
});

test('Une panne MySQL en production ne remplace pas la base par un fichier local', async (t) => {
  const { url, directory } = await startApi(t, {
    production: true,
    config: "<?php return ['DB_HOST' => '127.0.0.1', 'DB_PORT' => '1', 'DB_NAME' => 'avis_test', 'DB_USER' => 'test', 'DB_PASSWORD' => 'secret-de-test'];",
  });
  const response = await fetch(`${url}/api/reviews`, {
    method: 'POST', body: JSON.stringify({ name: 'Test', rating: 5, message: 'Avis' }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Le service est momentanément indisponible.' });
  await assert.rejects(readFile(join(directory, 'avis-communaute-reviews.json')), { code: 'ENOENT' });
});
