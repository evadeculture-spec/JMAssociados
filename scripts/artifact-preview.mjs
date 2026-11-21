// Prepara uma cópia de dist/ com ligações relativas, para pré-visualização privada fora do alojamento final.
// Uso: node scripts/artifact-preview.mjs <pasta-destino>
import { readdir, readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('Indique a pasta de destino.');
const dist = path.resolve('dist');
await mkdir(out, { recursive: true });
for (const d of ['css', 'js', 'fonts']) await cp(path.join(dist, d), path.join(out, d), { recursive: true });

const rel = (html) =>
  html
    .replace(/(href|src|action)="\/(css|js|fonts)\//g, '$1="$2/')
    .replace(/href="\/(#[^"]*)?"/g, (_, h) => `href="index.html${h || ''}"`)
    .replace(/href="\/([a-z0-9-]+)(#[^"]*)?"/g, (_, p, h) => `href="${p}.html${h || ''}"`);

for (const f of await readdir(dist)) {
  if (!f.endsWith('.html')) continue;
  let html = rel(await readFile(path.join(dist, f), 'utf8'));
  if (f === 'index.html') {
    // A página principal do artefacto recebe o esqueleto do serviço: retirar o nosso.
    html = html
      .replace(/<!DOCTYPE html>/i, '')
      .replace(/<html[^>]*>|<\/html>|<head>|<\/head>|<\/body>/gi, '')
      .replace(/<body[^>]*>/i, '')
      .replace(/<meta charset="utf-8"\s*\/?>/i, '')
      .replace(/<meta name="viewport"[^>]*>/i, '<meta name="claude:viewport-fit-sides" content="cover">');
    const t = html.match(/<title>[\s\S]*?<\/title>/)[0];
    html = t + html.replace(t, '');
  }
  await writeFile(path.join(out, f), html);
}
const css = await readFile(path.join(out, 'css/site.css'), 'utf8');
await writeFile(path.join(out, 'css/site.css'), css.replace(/url\(\/fonts\//g, 'url(../fonts/'));
console.log('Pré-visualização em', out);
