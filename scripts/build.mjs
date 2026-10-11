import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
// Only this generated output directory is replaced; source assets stay intact.
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) await copyFile(new URL(file, root), new URL(`dist/${file}`, root));
await cp(new URL('assets/', root), new URL('dist/assets/', root), { recursive: true });
console.log('Site estático gerado em dist/. Publique esse diretório em uma hospedagem pública.');
