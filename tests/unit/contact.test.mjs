import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContact, classifyReply, renderContactForm, transportFromEnv } from '../../src/lib/contact.mjs';
import { handleContact } from '../../src/lib/contact-handler.mjs';

const form = (fields, accept = 'text/html') =>
  new Request('http://localhost/api/contacto', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept },
    body: new URLSearchParams(fields).toString(),
  });

test('classifica telefone e e-mail', () => {
  assert.equal(classifyReply('912 345 678'), 'phone');
  assert.equal(classifyReply('+351 272 328 566'), 'phone');
  assert.equal(classifyReply('nome@exemplo.pt'), 'email');
  assert.equal(classifyReply('12345'), null);
  assert.equal(classifyReply('abc'), null);
});

test('valida campos obrigatórios e mensagem opcional', () => {
  const r = validateContact({ name: '  ', reply: '' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.name);
  assert.ok(r.errors.reply);
  const ok = validateContact({ name: 'Ana Silva', reply: '912345678' });
  assert.equal(ok.ok, true);
  assert.equal(ok.values.message, '');
});

test('limita o tamanho da mensagem', () => {
  const r = validateContact({ name: 'Ana', reply: 'a@b.pt', message: 'x'.repeat(2001) });
  assert.ok(r.errors.message);
});

test('campo-armadilha preenchido é recusado', () => {
  assert.equal(validateContact({ name: 'Ana', reply: 'a@b.pt', website: 'http://spam' }).ok, false);
});

test('o formulário escapa o texto preservado', () => {
  const html = renderContactForm({ values: { name: '<script>x</script>', message: 'a & b' } });
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(html.includes('a &amp; b'));
  assert.ok(!html.includes('<script>x'));
});

test('sem canal configurado: 503 com telefone e e-mail', async () => {
  const res = await handleContact(form({ name: 'Ana', reply: 'a@b.pt' }, 'application/json'), { transport: null });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.match(body.message, /272 328 566/);
  assert.match(body.message, /jma@jma-advogados\.com/);
  assert.equal(transportFromEnv({}), null);
});

test('erro de validação devolve o texto escrito (sem JavaScript)', async () => {
  const sent = [];
  const res = await handleContact(form({ name: 'Ana', reply: 'xx', message: 'Questão sobre partilhas' }), {
    transport: async (p) => (sent.push(p), true),
  });
  assert.equal(res.status, 422);
  const html = await res.text();
  assert.ok(html.includes('value="Ana"'));
  assert.ok(html.includes('value="xx"'));
  assert.ok(html.includes('Questão sobre partilhas'));
  assert.ok(html.includes('aria-invalid="true"'));
  assert.equal(sent.length, 0);
});

test('confirmação só após aceitação pelo serviço de envio', async () => {
  const sink = [];
  const transport = transportFromEnv({ CONTACT_TRANSPORT: 'test' }, { sink });
  const ok = await handleContact(form({ name: 'Ana Silva', reply: '912345678' }, 'application/json'), { transport });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true });
  assert.equal(sink.length, 1);
  assert.match(sink[0].text, /Telefone para resposta: 912345678/);

  const refused = await handleContact(form({ name: 'Ana [falha]', reply: '912345678', message: 'texto' }), { transport });
  assert.equal(refused.status, 502);
  const html = await refused.text();
  assert.ok(html.includes('texto'));
  assert.ok(!html.includes('recebido'));

  const throws = await handleContact(form({ name: 'Ana', reply: '912345678' }, 'application/json'), {
    transport: async () => { throw new Error('rede'); },
  });
  assert.equal(throws.status, 502);
  assert.equal((await throws.json()).ok, false);
});

test('envio sem JavaScript redireciona para a confirmação', async () => {
  const res = await handleContact(form({ name: 'Ana', reply: 'a@b.pt' }), { transport: async () => true });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/pedido-enviado');
});

test('webhook: falha HTTP do serviço não confirma', async () => {
  const transport = transportFromEnv(
    { CONTACT_TRANSPORT: 'webhook', CONTACT_WEBHOOK_URL: 'https://exemplo.invalid/hook' },
    { fetchImpl: async () => new Response('erro', { status: 500 }) },
  );
  const res = await handleContact(form({ name: 'Ana', reply: 'a@b.pt' }, 'application/json'), { transport });
  assert.equal(res.status, 502);
});

test('rejeita métodos que não sejam POST', async () => {
  const res = await handleContact(new Request('http://localhost/api/contacto'), { transport: async () => true });
  assert.equal(res.status, 405);
});
