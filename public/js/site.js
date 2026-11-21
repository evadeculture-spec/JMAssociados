// Melhorias progressivas. O site funciona sem este ficheiro.
(function () {
  'use strict';

  // Altura real do cabeçalho, para as âncoras não ficarem tapadas.
  var header = document.querySelector('.site-header');
  if (header) {
    var setH = function () { document.documentElement.style.setProperty('--header-offset', header.offsetHeight + 'px'); };
    setH();
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(header);
  }

  // Menu móvel
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.hidden = false;
    var setOpen = function (open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      var label = toggle.querySelector('.nav-toggle-label');
      if (label) label.textContent = open ? 'Fechar' : 'Menu';
      if (!open && returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      setOpen(open);
      if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    var mq = window.matchMedia('(min-width: 64em)');
    var onChange = function () { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  // Partilhar a ligação de uma secção
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-share');
      var url = location.origin + location.pathname + '#' + id;
      var title = btn.getAttribute('data-title') || document.title;
      var status = document.getElementById('share-status-' + id);
      var say = function (msg) { if (status) status.textContent = msg; };
      var copy = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            function () { say('Ligação copiada.'); },
            function () { say('Copie a ligação: ' + url); }
          );
        } else {
          say('Copie a ligação: ' + url);
        }
      };
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        navigator.share({ title: title, url: url }).catch(function (err) {
          if (!err || err.name !== 'AbortError') copy();
        });
      } else {
        copy();
      }
    });
  });

  // Formulário de contacto: envio sem recarregar a página. Sem JavaScript, o servidor responde com uma página.
  var form = document.getElementById('contact-form');
  if (form && window.fetch && window.FormData) {
    var labels = { name: 'Nome', reply: 'Telefone ou e-mail', message: 'Mensagem' };
    var summary = document.getElementById('form-summary');
    var button = form.querySelector('button[type="submit"]');

    var clearErrors = function () {
      form.querySelectorAll('.field-error[data-js]').forEach(function (n) { n.remove(); });
      ['name', 'reply', 'message'].forEach(function (k) {
        var input = document.getElementById('contact-' + k);
        if (!input) return;
        input.removeAttribute('aria-invalid');
        var ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== k + '-error'; });
        if (ids.length) input.setAttribute('aria-describedby', ids.join(' ')); else input.removeAttribute('aria-describedby');
      });
      form.querySelectorAll('.field-error').forEach(function (n) { n.remove(); });
      summary.hidden = true;
      summary.innerHTML = '';
    };

    var showSummary = function (html) {
      summary.innerHTML = html;
      summary.hidden = false;
      summary.focus();
    };

    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      button.disabled = true;
      var original = button.textContent;
      button.textContent = 'A enviar…';
      var body = new URLSearchParams(new FormData(form));
      fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false }; }).then(function (data) { return { status: res.status, data: data }; });
        })
        .then(function (r) {
          if (r.status === 200 && r.data && r.data.ok === true) {
            var done = document.createElement('div');
            done.className = 'form-status';
            done.setAttribute('role', 'status');
            done.setAttribute('tabindex', '-1');
            done.innerHTML = '<p><strong>Pedido de contacto recebido.</strong></p><p>O escritório responderá pelo meio indicado. A marcação de consulta fica sujeita a confirmação.</p>';
            form.replaceWith(done);
            done.focus();
            return;
          }
          if (r.status === 422 && r.data && r.data.errors) {
            var items = [];
            Object.keys(r.data.errors).forEach(function (k) {
              var input = document.getElementById('contact-' + k);
              if (!input) return;
              input.setAttribute('aria-invalid', 'true');
              var p = document.createElement('p');
              p.className = 'field-error';
              p.id = k + '-error';
              p.setAttribute('data-js', '');
              p.textContent = r.data.errors[k];
              input.insertAdjacentElement('afterend', p);
              var ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
              ids.push(k + '-error');
              input.setAttribute('aria-describedby', ids.join(' '));
              items.push('<li><a href="#contact-' + k + '">' + labels[k] + ': ' + esc(r.data.errors[k]) + '</a></li>');
            });
            showSummary('<p><strong>O pedido não foi enviado.</strong> Corrija os campos assinalados. O texto escrito foi mantido.</p><ul>' + items.join('') + '</ul>');
            return;
          }
          showSummary('<p><strong>O pedido não foi enviado.</strong></p><p>' + esc((r.data && r.data.message) || 'Ocorreu um erro no envio. O texto escrito foi mantido. Tente novamente ou ligue para 272 328 566.') + '</p>');
        })
        .catch(function () {
          showSummary('<p><strong>O pedido não foi enviado.</strong></p><p>Não foi possível estabelecer ligação. O texto escrito foi mantido. Tente novamente ou ligue para 272 328 566.</p>');
        })
        .then(function () {
          if (document.body.contains(button)) { button.disabled = false; button.textContent = original; }
        });
    });
  }
  // Índice lateral: assinala a secção visível.
  var spies = document.querySelectorAll('[data-spy]');
  if (spies.length && 'IntersectionObserver' in window) {
    var links = {};
    document.querySelectorAll('[data-toc-link]').forEach(function (a) { links[a.getAttribute('data-toc-link')] = a; });
    var visible = {};
    var mark = function () {
      var current = null;
      spies.forEach(function (s) { if (!current && visible[s.id]) current = s.id; });
      Object.keys(links).forEach(function (id) {
        if (id === current) links[id].setAttribute('aria-current', 'true');
        else links[id].removeAttribute('aria-current');
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      mark();
    }, { rootMargin: '-20% 0px -55% 0px' });
    spies.forEach(function (s) { io.observe(s); });
  }

  // Pesquisa de áreas de atuação (ignora acentos e maiúsculas).
  var searchBox = document.querySelector('[data-area-search]');
  if (searchBox) {
    searchBox.hidden = false;
    var input = searchBox.querySelector('input');
    var status = searchBox.querySelector('[role="status"]');
    var empty = document.querySelector('[data-area-empty]');
    var groups = document.querySelectorAll('.area-group[data-spy]');
    var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var run = function () {
      var q = norm(input.value.trim());
      var total = 0;
      groups.forEach(function (g) {
        var n = 0;
        g.querySelectorAll('[data-terms]').forEach(function (li) {
          var hit = !q || norm(li.getAttribute('data-terms')).indexOf(q) !== -1;
          li.hidden = !hit;
          if (hit) n++;
        });
        g.hidden = n === 0;
        total += n;
      });
      if (empty) empty.hidden = total !== 0;
      status.textContent = q ? (total === 1 ? '1 área encontrada.' : total + ' áreas encontradas.') : '';
    };
    input.addEventListener('input', run);
  }
})();
