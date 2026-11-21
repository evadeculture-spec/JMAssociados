# João Marcelo & Associados – site institucional

Nova versão do site de João Marcelo & Associados – Sociedade de Advogados, R.L., em português de Portugal.
Referência factual: https://www.jma-advogados.com.pt/ (Wix). **A publicação no domínio oficial depende de aprovação do escritório.**

## Tecnologia

- [Astro](https://astro.build) em modo estático: HTML gerado, sem framework no cliente.
- `public/css/site.css` e `public/js/site.js` (melhorias progressivas: menu móvel, partilha de ligações, envio do formulário). O site funciona sem JavaScript.
- Tipos de letra Cormorant Garamond (marca e títulos) e Source Sans 3 (texto), alojados no próprio site (licença OFL, em `public/fonts`). Sem pedidos a terceiros e sem cookies.
- Logótipo oficial em `src/assets/brand/logo-jma.png` (componente `src/components/Logo.astro`).
- Fundo fotográfico permanente: `src/components/Backdrop.astro` (camada fixa, uma camada por fotografia) controlado em `public/js/site.js`; cada secção indica `data-bg` (`sala`, `biblioteca`, `recorte`) e `data-shade` (`none`, `light`, `medium`, `hero`, `dark`, `deep`).
- Fotografias do escritório em `src/assets/photos` (preparadas com `python3 -I scripts/prepare-photos.py <originais> src/assets/photos`), servidas em AVIF/WebP/JPEG responsivos pelo componente `src/components/Photo.astro`.
- Função `netlify/functions/contacto.mjs` (`POST /api/contacto`) para o pedido de contacto, com validação no servidor (`src/lib/contact*.mjs`).

## Comandos

```sh
npm install
npm run dev        # desenvolvimento
npm run build      # compila para dist/
npm test           # testes unitários do formulário (node:test)
npm run test:e2e   # testes no navegador (Playwright + axe-core) a 360, 768 e 1440 px
npm run serve:test # serve dist/ com um canal de envio de teste em memória
```

## Interruptores de compilação

| Variável | Efeito |
|---|---|
| `PUBLIC_REVIEW=false` | Retira a faixa e as notas de revisão e permite a indexação. Por omissão a revisão está ativa (`noindex`). |
| `PUBLIC_CONTACT_FORM=on` | Mostra o formulário. Só deve ser ativado com um canal de envio configurado. |

Canal de envio da função (variáveis de ambiente no alojamento):

- `CONTACT_TRANSPORT=resend`, `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`; ou
- `CONTACT_TRANSPORT=webhook`, `CONTACT_WEBHOOK_URL`.

Sem canal, a função responde 503 com telefone e e-mail, e a confirmação só aparece quando o serviço aceita o envio.

## Documentação para revisão

- `docs/mapa-areas.md` — correspondência entre as áreas publicadas e a nova organização.
- `docs/enderecos.md` — inventário de endereços e âncoras públicos e o seu destino.
- `docs/confirmacoes.md` — elementos que exigem confirmação da sociedade.
