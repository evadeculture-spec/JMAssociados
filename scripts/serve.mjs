// Servidor local para testes em ambiente controlado.
// Serve dist/ como o alojamento (/contactos → contactos.html) e encaminha POST /api/contacto
// para o mesmo código da função de produção, com um canal de envio de teste em memória.
// Nenhum pedido sai desta máquina: o escritório não é contactado.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleContact } from '../src/lib/contact-handler.mjs';
import { transportFromEnv } from '../src/lib/contact.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const redirects = { '/contratacao-publica': '/direito-administrativo#contratacao-publica' };

export function createServer({ channel = process.env.CONTACT_TRANSPORT ?? 'test', root = defaultRoot } = {}) {
  const sink = [];
  const transport = transportFromEnv({ CONTACT_TRANSPORT: channel }, { sink });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/contacto') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      const response = await handleContact(request, { transport });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (redirects[url.pathname]) { res.writeHead(301, { location: redirects[url.pathname] }); res.end(); return; }
    const candidates = url.pathname === '/' ? ['index.html'] : [url.pathname.slice(1), url.pathname.slice(1) + '.html'];
    for (const c of candidates) {
      const file = path.join(root, path.normalize(c));
      if (!file.startsWith(root)) break;
      try {
        if ((await stat(file)).isFile()) {
          res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
          res.end(await readFile(file));
          return;
        }
      } catch {}
    }
    res.writeHead(404, { 'content-type': types['.html'] });
    res.end(await readFile(path.join(root, '404.html')));
  });
  return { server, sink };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4321);
  const { server, sink } = createServer();
  server.listen(port, () => console.log(`http://localhost:${port} (canal de envio: ${process.env.CONTACT_TRANSPORT ?? 'test'})`));
  process.on('SIGINT', () => { console.log(`Pedidos recebidos no canal de teste: ${sink.length}`); process.exit(0); });
}
