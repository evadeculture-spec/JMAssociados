// Pedido de contacto: validação, apresentação do formulário e envio.
// Módulo partilhado pela página /contactos (gerada) e pela função de servidor
// netlify/functions/contacto.mjs. Sem dependências.

export const LIMITS = { name: 120, reply: 160, message: 2000 };

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

/** Normaliza texto recebido: remove espaços nas pontas e caracteres de controlo (exceto quebras de linha na mensagem). */
function clean(value, { multiline = false } = {}) {
  const s = typeof value === 'string' ? value : '';
  const stripped = multiline
    ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return stripped.trim();
}

/** Aceita um endereço de e-mail ou um número de telefone (9 a 15 algarismos, com +, espaços, hífenes ou parênteses). */
export function classifyReply(reply) {
  if (EMAIL_RE.test(reply)) return 'email';
  if (/^[+()\d\s.-]+$/.test(reply)) {
    const digits = reply.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 15) return 'phone';
  }
  return null;
}

/**
 * Valida os campos do pedido.
 * @param {Record<string, unknown>} input
 * @returns {{ ok: boolean, values: {name: string, reply: string, message: string}, errors: Record<string,string>, replyType: string|null, spam: boolean }}
 */
export function validateContact(input) {
  const values = {
    name: clean(input.name),
    reply: clean(input.reply),
    message: clean(input.message, { multiline: true }),
  };
  const errors = {};
  if (!values.name) errors.name = 'Indique o seu nome.';
  else if (values.name.length > LIMITS.name) errors.name = `O nome não pode ter mais de ${LIMITS.name} caracteres.`;

  let replyType = null;
  if (!values.reply) errors.reply = 'Indique um telefone ou um endereço de e-mail para a resposta.';
  else if (values.reply.length > LIMITS.reply) errors.reply = 'O contacto indicado é demasiado longo.';
  else {
    replyType = classifyReply(values.reply);
    if (!replyType) errors.reply = 'Indique um telefone com 9 algarismos ou mais, ou um e-mail como nome@exemplo.pt.';
  }

  if (values.message.length > LIMITS.message)
    errors.message = `A mensagem não pode ter mais de ${LIMITS.message} caracteres. Tem ${values.message.length}.`;

  // Campo-armadilha invisível para pessoas; preenchido apenas por robôs.
  const spam = clean(input.website) !== '';
  return { ok: Object.keys(errors).length === 0 && !spam, values, errors, replyType, spam };
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FIELD_ORDER = ['name', 'reply', 'message'];

/**
 * Marcação do formulário. Usada na página gerada e na resposta de erro do servidor,
 * para que o texto escrito seja preservado mesmo sem JavaScript.
 */
export function renderContactForm({ values = {}, errors = {}, action = '/api/contacto' } = {}) {
  const v = { name: '', reply: '', message: '', ...values };
  const errorKeys = FIELD_ORDER.filter((k) => errors[k]);
  const err = (k) =>
    errors[k] ? `<p class="field-error" id="${k}-error">${escapeHtml(errors[k])}</p>` : '';
  const invalid = (k) => (errors[k] ? ' aria-invalid="true"' : '');
  const describedBy = (k, hint) => {
    const ids = [hint, errors[k] ? `${k}-error` : null].filter(Boolean);
    return ids.length ? ` aria-describedby="${ids.join(' ')}"` : '';
  };
  const labels = { name: 'Nome', reply: 'Telefone ou e-mail', message: 'Mensagem' };
  const summary = errorKeys.length
    ? `<div class="form-summary" id="form-summary" role="alert" tabindex="-1">
        <p><strong>O pedido não foi enviado.</strong> Corrija ${errorKeys.length === 1 ? 'o campo assinalado' : 'os campos assinalados'}. O texto escrito foi mantido.</p>
        <ul>${errorKeys.map((k) => `<li><a href="#contact-${k}">${labels[k]}: ${escapeHtml(errors[k])}</a></li>`).join('')}</ul>
      </div>`
    : `<div class="form-summary" id="form-summary" role="alert" tabindex="-1" hidden></div>`;

  return `<form class="contact-form" id="contact-form" method="post" action="${escapeHtml(action)}" novalidate>
  ${summary}
  <div class="field">
    <label for="contact-name">Nome</label>
    <input id="contact-name" name="name" type="text" autocomplete="name" required maxlength="${LIMITS.name}" value="${escapeHtml(v.name)}"${invalid('name')}${describedBy('name')}>
    ${err('name')}
  </div>
  <div class="field">
    <label for="contact-reply">Telefone ou e-mail</label>
    <p class="field-hint" id="reply-hint">Indique um meio para a resposta.</p>
    <input id="contact-reply" name="reply" type="text" autocomplete="email" required maxlength="${LIMITS.reply}" value="${escapeHtml(v.reply)}"${invalid('reply')}${describedBy('reply', 'reply-hint')}>
    ${err('reply')}
  </div>
  <div class="field">
    <label for="contact-message">Mensagem <span class="optional">(opcional)</span></label>
    <p class="field-hint" id="message-hint">Basta um contacto inicial. Não inclua pormenores confidenciais nem envie documentos.</p>
    <textarea id="contact-message" name="message" rows="5" maxlength="${LIMITS.message}"${invalid('message')}${describedBy('message', 'message-hint')}>${escapeHtml(v.message)}</textarea>
    ${err('message')}
  </div>
  <div class="hp" aria-hidden="true">
    <label for="contact-website">Não preencher</label>
    <input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off">
  </div>
  <p class="form-privacy">Os dados indicados servem apenas para responder a este pedido. Consulte a <a href="/politica-privacidade">Política de Privacidade</a>.</p>
  <button class="button" type="submit">Enviar pedido de contacto</button>
</form>`;
}

/** Corpo de texto simples para o escritório. */
export function formatMessage({ name, reply, message }, replyType, receivedAt = new Date()) {
  return [
    'Pedido de contacto recebido através do site.',
    '',
    `Nome: ${name}`,
    `${replyType === 'email' ? 'E-mail' : 'Telefone'} para resposta: ${reply}`,
    `Recebido em: ${receivedAt.toISOString()}`,
    '',
    'Mensagem:',
    message || '(sem mensagem)',
  ].join('\n');
}

/**
 * Escolhe o canal de envio a partir das variáveis de ambiente.
 * Devolve null quando não há canal configurado.
 *  - CONTACT_TRANSPORT=webhook + CONTACT_WEBHOOK_URL: envia JSON por POST.
 *  - CONTACT_TRANSPORT=resend + RESEND_API_KEY + CONTACT_TO + CONTACT_FROM: envia e-mail pela API Resend.
 *  - CONTACT_TRANSPORT=test: guarda em memória (apenas para testes locais).
 */
export function transportFromEnv(env, { fetchImpl = globalThis.fetch, sink } = {}) {
  const kind = env.CONTACT_TRANSPORT;
  if (kind === 'webhook' && env.CONTACT_WEBHOOK_URL) {
    return async (payload) => {
      const res = await fetchImpl(env.CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    };
  }
  if (kind === 'resend' && env.RESEND_API_KEY && env.CONTACT_TO && env.CONTACT_FROM) {
    return async (payload) => {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: env.CONTACT_FROM,
          to: [env.CONTACT_TO],
          subject: `Pedido de contacto – ${payload.name}`,
          text: payload.text,
          ...(payload.replyType === 'email' ? { reply_to: payload.reply } : {}),
        }),
      });
      return res.ok;
    };
  }
  if (kind === 'test' && sink) {
    return async (payload) => {
      if (payload.name.includes('[falha]')) return false; // simula recusa do serviço
      sink.push(payload);
      return true;
    };
  }
  return null;
}
