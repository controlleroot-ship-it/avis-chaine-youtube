import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const output = new URL('../hostinger-site/', import.meta.url);
await readFile(new URL('../dist/index.html', import.meta.url));
await rm(output, { recursive: true, force: true });
await cp(new URL('../dist/', import.meta.url), output, { recursive: true });
await mkdir(new URL('api/', output));
for (const file of ['index.php', 'router.php']) {
  await cp(new URL(`../api/${file}`, import.meta.url), new URL(`api/${file}`, output));
}
await cp(new URL('../deploy/hostinger.htaccess', import.meta.url), new URL('.htaccess', output));
await writeFile(new URL('release.json', output), JSON.stringify({ revision }) + '\n');
console.log('Paquet Hostinger prêt dans hostinger-site/');
