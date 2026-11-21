// Testes de aceitação no navegador (Chromium via Playwright), em ambiente controlado.
// Compila duas variantes (formulário desativado, como na pré-visualização, e ativado com canal de teste),
// serve-as localmente e percorre as tarefas definidas. Não envia nada para fora desta máquina.
//   npm run test:e2e            → executa
//   SCREENSHOTS=dir npm run test:e2e → guarda capturas a 360, 768 e 1440 px
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SHOTS = process.env.SCREENSHOTS;

const PAGES = ['/', '/sociedade', '/areas-de-atuacao', '/direito-administrativo', '/contactos', '/politica-privacidade', '/politica-cookies'];
const WIDTHS = [360, 768, 1440];

let browser, preview, withForm;

async function startServer(dist) {
  // Importação dinâmica com raiz configurável.
  const mod = await import('../../scripts/serve.mjs');
  const { server, sink } = mod.createServer({ channel: 'test', root: dist });
  await new Promise((r) => server.listen(0, r));
  return { server, sink, base: `http://localhost:${server.address().port}` };
}

before(async () => {
  if (!process.env.SKIP_BUILD) {
    execSync('npx astro build --outDir dist', { cwd: projectRoot, stdio: 'ignore', env: { ...process.env, PUBLIC_CONTACT_FORM: 'off' } });
    execSync('npx astro build --outDir .test-dist-form', { cwd: projectRoot, stdio: 'ignore', env: { ...process.env, PUBLIC_CONTACT_FORM: 'on' } });
  }
  preview = await startServer(path.join(projectRoot, 'dist'));
  withForm = await startServer(path.join(projectRoot, '.test-dist-form'));
  browser = await chromium.launch();
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
});

after(async () => {
  await browser?.close();
  preview?.server.close();
  withForm?.server.close();
});

async function newPage(width, opts = {}) {
  const context = await browser.newContext({
    viewport: { width, height: opts.height ?? (width < 700 ? 760 : 900) },
    isMobile: width < 700 && !opts.desktop,
    hasTouch: width < 700 && !opts.desktop,
    deviceScaleFactor: opts.scale ?? 1,
    javaScriptEnabled: opts.js ?? true,
    reducedMotion: opts.reducedMotion ?? 'no-preference',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.jsErrors = errors;
  return page;
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

/** O título alvo da âncora fica visível e não tapado pelo cabeçalho. */
async function headingNotHidden(page, selector) {
  // Espera que o deslocamento (eventualmente suave) termine.
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) break;
    last = y;
  }
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const header = document.querySelector('.site-header');
    const h = el.getBoundingClientRect();
    const hb = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0;
    return { ok: h.top >= hb - 1 && h.top < window.innerHeight, top: h.top, headerBottom: hb };
  }, selector);
}

test('todas as páginas: sem deslocamento horizontal, títulos e descrições próprios, sem erros de JS (360/768/1440)', async () => {
  const titles = new Set();
  for (const width of WIDTHS) {
    const page = await newPage(width);
    for (const p of PAGES) {
      const res = await page.goto(preview.base + p);
      assert.equal(res.status(), 200, p);
      assert.ok(await noHorizontalScroll(page), `deslocamento horizontal em ${p} a ${width}px`);
      const title = await page.title();
      const desc = await page.getAttribute('meta[name="description"]', 'content');
      assert.ok(desc && desc.length > 50 && desc.length < 170, `descrição de ${p}: ${desc?.length}`);
      assert.equal(await page.locator('h1').count(), 1, `um h1 em ${p}`);
      if (width === 360) titles.add(title);
      if (SHOTS) {
        const name = (p === '/' ? 'inicio' : p.slice(1)) + `-${width}.png`;
        await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
      }
    }
    assert.deepEqual(page.jsErrors, []);
    await page.context().close();
  }
  assert.equal(titles.size, PAGES.length, 'títulos distintos por página');
});

test('acessibilidade automática (axe, WCAG 2.1 AA, incluindo contraste) em todas as páginas', async () => {
  for (const width of [360, 1440]) {
    const page = await newPage(width);
    for (const p of [...PAGES, '/pedido-enviado']) {
      await page.goto(preview.base + p);
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(async () =>
        // eslint-disable-next-line no-undef
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
      );
      const v = result.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      assert.deepEqual(v, [], `${p} a ${width}px`);
    }
    // Formulário ativo, incluindo estado de erro.
    await page.goto(withForm.base + '/contactos');
    await page.click('button[type=submit]');
    await page.waitForSelector('#form-summary:not([hidden])');
    await page.addScriptTag({ content: axeSource });
    const r = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    assert.deepEqual(r.violations.map((x) => x.id), [], `formulário com erros a ${width}px`);
    await page.context().close();
  }
});

test('âncoras públicas do site anterior continuam a existir na página inicial', async () => {
  const page = await newPage(1440);
  await page.goto(preview.base + '/');
  for (const id of ['sobre', 'reasdeatuao', 'direitoadministrativo', 'contactos']) {
    assert.equal(await page.locator(`#${id}`).count(), 1, id);
  }
  for (const p of ['/politica-privacidade', '/politica-cookies']) {
    assert.equal((await page.goto(preview.base + p)).status(), 200, p);
  }
  await page.context().close();
});

test('tarefa 1 (telemóvel, 360 px): encontrar «Divórcios» e o telefone', async () => {
  const page = await newPage(360);
  await page.goto(preview.base + '/');
  // Primeiro ecrã: nome, localização e ação principal.
  const firstScreen = await page.evaluate(() => {
    const vis = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.bottom <= window.innerHeight && r.top >= 0; };
    return { h1: vis('h1'), cta: vis('.hero .button'), lede: vis('.hero .lede') };
  });
  assert.deepEqual(firstScreen, { h1: true, cta: true, lede: true }, 'nome, apresentação e «Pedir consulta» no primeiro ecrã');
  assert.match(await page.locator('.hero').innerText(), /Castelo Branco/);
  const tel = page.locator('.hero a[href^="tel:"]');
  assert.equal(await tel.getAttribute('href'), 'tel:+351272328566');

  // Divórcios visível no índice resumido; segue para o grupo.
  const link = page.locator('#reasdeatuao a', { hasText: 'Divórcios' });
  assert.equal(await link.count(), 1);
  await link.click();
  await page.waitForURL(/areas-de-atuacao#familia$/);
  assert.ok((await headingNotHidden(page, '#familia-title')).ok, 'título do grupo não tapado pelo cabeçalho');
  assert.ok(await page.locator('#familia').getByText('Divórcios', { exact: true }).isVisible());
  assert.ok(await page.locator('#familia').getByText('Partilhas', { exact: true }).isVisible());
  // Telefone no rodapé, como ligação de marcação.
  assert.equal(await page.locator('footer a[href="tel:+351272328566"]').count(), 1);
  // Ambas as designações de trabalho são pesquisáveis.
  const text = await page.locator('main').innerText();
  assert.match(text, /Direito do Trabalho/);
  assert.match(text, /Direito Laboral/);
  await page.context().close();
});

test('tarefa 2: abrir e partilhar «Contratação pública» (360 e 1440 px)', async () => {
  for (const width of [360, 1440]) {
    const page = await newPage(width);
    await page.goto(preview.base + '/');
    if (width < 960) {
      await page.click('.nav-toggle');
      assert.equal(await page.getAttribute('.nav-toggle', 'aria-expanded'), 'true');
    }
    await page.click('#site-nav a[href="/direito-administrativo"]');
    await page.waitForURL(/\/direito-administrativo$/);
    await page.click('.toc a[href="#contratacao-publica"]');
    await page.waitForURL(/#contratacao-publica$/);
    const h = await headingNotHidden(page, '#contratacao-publica-title');
    assert.ok(h.ok, `título tapado: ${JSON.stringify(h)}`);
    // Abrir diretamente pelo endereço.
    await page.goto(preview.base + '/direito-administrativo#contratacao-publica');
    assert.ok((await headingNotHidden(page, '#contratacao-publica-title')).ok, 'acesso direto');
    // Atalho estável.
    await page.goto(preview.base + '/contratacao-publica');
    assert.match(page.url(), /\/direito-administrativo#contratacao-publica$/);
    // Copiar ligação (no computador; no telemóvel usa a partilha nativa quando existe).
    if (width === 1440) {
      await page.click('[data-share="contratacao-publica"]');
      await page.waitForFunction(() => document.getElementById('share-status-contratacao-publica').textContent.length > 0);
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(copied.endsWith('/direito-administrativo#contratacao-publica'), copied);
    }
    // A ligação visível também serve para copiar manualmente.
    assert.match(await page.locator('#contratacao-publica .share-url').innerText(), /jma-advogados\.com\.pt\/direito-administrativo#contratacao-publica$/);
    await page.context().close();
  }
});

test('tarefa 3a (360 px, pré-visualização sem canal): «Pedir consulta» leva a telefone e e-mail funcionais', async () => {
  const page = await newPage(360);
  await page.goto(preview.base + '/');
  await page.click('.hero .button');
  await page.waitForURL(/\/contactos#pedir-consulta$/);
  assert.ok((await headingNotHidden(page, '#consulta-title')).ok);
  const section = page.locator('#pedir-consulta');
  assert.match(await section.innerText(), /sujeita a confirmação/);
  assert.match(await section.innerText(), /custo chamada para a rede fixa nacional/);
  assert.equal(await section.locator('a[href="tel:+351272328566"]').count(), 1);
  assert.equal(await section.locator('a[href^="mailto:jma@jma-advogados.com"]').count(), 1);
  assert.equal(await page.locator('#contact-form').count(), 0, 'sem canal, não há formulário');
  const maps = page.locator('#morada a[href^="https://www.google.com/maps/search/"]');
  assert.equal(await maps.count(), 1);
  await page.context().close();
});

test('tarefa 3b (360 px, canal de teste): pedir contacto pelo telemóvel', async () => {
  const page = await newPage(360);
  await page.goto(withForm.base + '/contactos#pedir-consulta');
  const before = withForm.sink.length;
  // 1. Envio vazio: erros, sem confirmação.
  await page.click('button[type=submit]');
  await page.waitForSelector('#form-summary:not([hidden])');
  assert.equal(await page.getAttribute('#contact-name', 'aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'form-summary');
  // 2. Contacto inválido: a mensagem escrita mantém-se.
  await page.fill('#contact-name', 'Maria Teste');
  await page.fill('#contact-reply', '123');
  await page.fill('#contact-message', 'Gostaria de marcar uma consulta sobre partilhas.');
  await page.click('button[type=submit]');
  await page.waitForSelector('#reply-error');
  assert.equal(await page.inputValue('#contact-message'), 'Gostaria de marcar uma consulta sobre partilhas.');
  assert.equal(await page.locator('#name-error').count(), 0);
  // 3. Serviço de envio recusa: sem confirmação, texto mantido.
  await page.fill('#contact-reply', '912345678');
  await page.fill('#contact-name', 'Maria [falha]');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => /falha no serviço/.test(document.getElementById('form-summary').textContent));
  assert.equal(await page.locator('.form-status').count(), 0);
  assert.equal(await page.inputValue('#contact-message'), 'Gostaria de marcar uma consulta sobre partilhas.');
  // 4. Aceite: confirmação.
  await page.fill('#contact-name', 'Maria Teste');
  await page.click('button[type=submit]');
  await page.waitForSelector('.form-status');
  assert.match(await page.locator('.form-status').innerText(), /Pedido de contacto recebido/);
  assert.equal(withForm.sink.length, before + 1);
  assert.equal(withForm.sink.at(-1).reply, '912345678');
  await page.context().close();
});

test('tarefa 3c (sem JavaScript): erro preserva o texto; sucesso mostra confirmação', async () => {
  // Deslocamento suave desligado: o Playwright não clica durante a animação de scroll.
  const page = await newPage(360, { js: false, reducedMotion: 'reduce' });
  await page.goto(withForm.base + '/contactos');
  await page.fill('#contact-name', 'Rui Teste');
  await page.fill('#contact-reply', 'não sei');
  await page.fill('#contact-message', 'Texto a preservar.');
  await page.click('button[type=submit]');
  assert.match(await page.locator('h1').innerText(), /Pedido não enviado/);
  assert.equal(await page.inputValue('#contact-name'), 'Rui Teste');
  assert.equal(await page.inputValue('#contact-message'), 'Texto a preservar.');
  await page.fill('#contact-reply', 'rui@exemplo.pt');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/pedido-enviado$/);
  assert.match(await page.locator('h1').innerText(), /recebido/);
  // Navegação visível sem JavaScript.
  assert.ok(await page.locator('#site-nav a[href="/contactos"]').isVisible());
  await page.context().close();
});

test('teclado: ligação para saltar, foco visível, menu móvel com Escape', async () => {
  const page = await newPage(360);
  await page.goto(preview.base + '/');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'conteudo');
  // Menu
  await page.focus('.nav-toggle');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('.nav-toggle', 'aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '/sociedade');
  assert.ok(await page.locator('#site-nav a[href="/contactos"]').isVisible());
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('.nav-toggle', 'aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'nav-toggle');
  assert.ok(!(await page.locator('#site-nav').isVisible()));
  // Foco visível num link (contorno de 3 px).
  await page.focus('.hero .button');
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth]; });
  assert.deepEqual(ring, ['solid', '3px']);
  await page.context().close();
});

test('ampliação a 200%: ler e agir (1440 e 360 px equivalentes)', async () => {
  // Ampliação de 200% = metade dos píxeis CSS disponíveis com escala 2.
  for (const [w, h] of [[720, 450], [180, 380]]) {
    const page = await newPage(w, { height: h, scale: 2, desktop: true });
    for (const p of PAGES) {
      await page.goto(preview.base + p);
      assert.ok(await noHorizontalScroll(page), `deslocamento horizontal a 200% em ${p} (${w}px)`);
    }
    await page.goto(preview.base + '/');
    const cta = page.locator('.hero .button');
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForURL(/contactos#pedir-consulta/);
    const h2 = await headingNotHidden(page, '#consulta-title');
    assert.ok(h2.ok, `a 200% (${w}px): ${JSON.stringify(h2)}`);
    await page.goto(preview.base + '/direito-administrativo#contratacao-publica');
    const h3 = await headingNotHidden(page, '#contratacao-publica-title');
    assert.ok(h3.ok, `acesso direto a 200% (${w}px): ${JSON.stringify(h3)}`);
    await page.context().close();
  }
  // Ampliação só de texto (200% do tamanho de letra).
  const page = await newPage(360);
  await page.goto(preview.base + '/');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  assert.ok(await noHorizontalScroll(page), 'texto a 200% sem deslocamento horizontal');
  await page.context().close();
});

test('movimento reduzido: sem deslocamento animado', async () => {
  const page = await newPage(1440, { reducedMotion: 'reduce' });
  await page.goto(preview.base + '/');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  const anims = await page.evaluate(() => document.getAnimations().length);
  assert.equal(anims, 0);
  await page.context().close();
});
