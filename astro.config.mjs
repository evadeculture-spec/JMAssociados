// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Páginas geradas como ficheiros (/contactos.html servido em /contactos),
// para manter os endereços públicos atuais sem barra final
// (/politica-privacidade, /politica-cookies).
export default defineConfig({
  site: 'https://www.jma-advogados.com.pt',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('pedido-enviado') && !page.includes('404'),
    }),
  ],
});
