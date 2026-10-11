import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
export function createServer() {
  return http.createServer(async (req, res) => {
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { ...headers, Allow: 'GET, HEAD' }); res.end(); return; }
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      // Serve only the public website, never Git metadata or development files.
      const publicPath = path === '/' ? 'index.html' : path.slice(1);
      if (!['index.html', 'styles.css', 'app.js'].includes(publicPath) && !publicPath.startsWith('assets/')) throw new Error('Not public');
      const file = resolve(root, publicPath);
      if (!file.startsWith(root + sep) || publicPath.split('/').some(part => part.startsWith('.'))) throw new Error('Not public');
      const data = await readFile(file);
      res.writeHead(200, { ...headers, 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página não encontrada.'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () => console.log(`EJN Benefícios disponível em http://localhost:${port}`));
}
