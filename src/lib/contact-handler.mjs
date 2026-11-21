// Tratamento do pedido de contacto (Request → Response, API Web padrão).
import {
  validateContact,
  renderContactForm,
  formatMessage,
  escapeHtml,
} from './contact.mjs';

const MAX_BODY = 16 * 1024;
const PHONE = '272 328 566';
const EMAIL = 'jma@jma-advogados.com';

function wantsJson(request) {
  return (request.headers.get('accept') || '').includes('application/json');
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Página mínima devolvida sem JavaScript quando o pedido não é aceite. Mantém o texto escrito. */
function htmlPage(status, { title, intro, form }) {
  const body = `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} | João Marcelo & Associados</title>
<link rel="stylesheet" href="/css/site.css">
</head>
<body>
<a class="skip-link" href="#conteudo">Saltar para o conteúdo</a>
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="/"><span class="brand-name">João Marcelo &amp; Associados</span><span class="brand-descriptor">Sociedade de Advogados, R.L.</span></a>
</div></header>
<main id="conteudo" class="wrap page">
<h1>${escapeHtml(title)}</h1>
<p class="lede">${intro}</p>
${form || ''}
<p><a href="/contactos">Voltar aos contactos</a></p>
</main>
</body>
</html>`;
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function readFields(request) {
  const type = request.headers.get('content-type') || '';
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  if (type.includes('application/json')) {
    try { return JSON.parse(text); } catch { return null; }
  }
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  return null;
}

/**
 * @param {Request} request
 * @param {{ transport: null | ((payload: object) => Promise<boolean>), now?: () => Date, log?: (msg: string) => void }} deps
 */
export async function handleContact(request, { transport, now = () => new Date(), log = () => {} }) {
  const asJson = wantsJson(request);
  if (request.method !== 'POST') {
    return new Response('Método não permitido.', { status: 405, headers: { allow: 'POST' } });
  }

  const fallback = `Pode contactar o escritório pelo telefone ${PHONE} ou pelo e-mail ${EMAIL}.`;

  if (!transport) {
    log('contacto: canal de envio não configurado');
    const msg = `O envio de pedidos pelo site não está disponível. ${fallback}`;
    return asJson
      ? json(503, { ok: false, message: msg })
      : htmlPage(503, { title: 'Pedido não enviado', intro: escapeHtml(msg) });
  }

  const fields = await readFields(request);
  if (!fields || typeof fields !== 'object') {
    const msg = 'Não foi possível ler o pedido. Tente novamente.';
    return asJson ? json(400, { ok: false, message: msg }) : htmlPage(400, { title: 'Pedido não enviado', intro: msg });
  }

  const result = validateContact(fields);
  if (result.spam) {
    return asJson ? json(400, { ok: false, message: 'Pedido recusado.' }) : htmlPage(400, { title: 'Pedido não enviado', intro: 'Pedido recusado.' });
  }
  if (!result.ok) {
    return asJson
      ? json(422, { ok: false, errors: result.errors, message: 'O pedido não foi enviado. Corrija os campos assinalados.' })
      : htmlPage(422, {
          title: 'Pedido não enviado',
          intro: 'Corrija os campos assinalados e envie novamente. O texto escrito foi mantido.',
          form: renderContactForm({ values: result.values, errors: result.errors }),
        });
  }

  const payload = {
    ...result.values,
    replyType: result.replyType,
    receivedAt: now().toISOString(),
    text: formatMessage(result.values, result.replyType, now()),
  };

  let accepted = false;
  try {
    accepted = await transport(payload);
  } catch (e) {
    log(`contacto: erro no envio: ${e && e.message}`);
    accepted = false;
  }

  if (!accepted) {
    const msg = `O pedido não foi enviado por uma falha no serviço de envio. O texto escrito foi mantido. Tente novamente dentro de alguns minutos. ${fallback}`;
    return asJson
      ? json(502, { ok: false, message: msg })
      : htmlPage(502, {
          title: 'Pedido não enviado',
          intro: escapeHtml(msg),
          form: renderContactForm({ values: result.values }),
        });
  }

  return asJson
    ? json(200, { ok: true })
    : new Response(null, { status: 303, headers: { location: '/pedido-enviado', 'cache-control': 'no-store' } });
}
