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
  // Cabeçalho: sombra discreta depois de deslocar a página.
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Revelação discreta de títulos e fotografias, só para o que está abaixo da dobra.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (!reduce && reveals.length && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('is-pending'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('is-pending');
        ro.observe(el);
      }
    });
    // Ao saltar para uma âncora ou imprimir, mostrar tudo.
    var showAll = function () { reveals.forEach(function (el) { el.classList.remove('is-pending'); }); };
    window.addEventListener('hashchange', showAll);
    window.addEventListener('beforeprint', showAll);
  }

  // Áreas de atuação na página inicial: acordeão acessível em ecrãs estreitos.
  var acc = document.querySelector('[data-accordion]');
  if (acc) {
    var narrow = window.matchMedia('(max-width: 47.99em)');
    var items = acc.querySelectorAll('.area');
    var build = function () {
      acc.classList.add('is-accordion');
      items.forEach(function (item) {
        var head = item.querySelector('.area-head');
        var body = item.querySelector('.area-body');
        if (head.querySelector('button')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'area-toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', body.id);
        while (head.firstChild) btn.appendChild(head.firstChild);
        var chev = document.createElement('span');
        chev.className = 'chev';
        chev.setAttribute('aria-hidden', 'true');
        btn.appendChild(chev);
        head.appendChild(btn);
        body.hidden = true;
        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') !== 'true';
          btn.setAttribute('aria-expanded', String(open));
          body.hidden = !open;
        });
      });
    };
    var unbuild = function () {
      acc.classList.remove('is-accordion');
      items.forEach(function (item) {
        var head = item.querySelector('.area-head');
        var btn = head.querySelector('button');
        var body = item.querySelector('.area-body');
        if (!btn) return;
        var chev = btn.querySelector('.chev');
        if (chev) chev.remove();
        while (btn.firstChild) head.insertBefore(btn.firstChild, btn);
        btn.remove();
        body.hidden = false;
      });
    };
    var apply = function () { if (narrow.matches) build(); else unbuild(); };
    apply();
    if (narrow.addEventListener) narrow.addEventListener('change', apply);
  }
  // Fundo fotográfico permanente: troca suave de fotografia conforme a secção ao centro do ecrã.
  var backdrop = document.querySelector('[data-backdrop]');
  if (backdrop) {
    var layers = {};
    backdrop.querySelectorAll('.bd-layer').forEach(function (l) { layers[l.getAttribute('data-key')] = l; });
    var hydrate = function (layer) {
      if (!layer || layer.hasAttribute('data-ready')) return;
      layer.setAttribute('data-ready', '');
      layer.querySelectorAll('source[data-srcset]').forEach(function (s) { s.srcset = s.getAttribute('data-srcset'); s.removeAttribute('data-srcset'); });
      var img = layer.querySelector('img');
      if (img && img.hasAttribute('data-src')) {
        img.srcset = img.getAttribute('data-srcset');
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-srcset');
        img.removeAttribute('data-src');
      }
    };
    backdrop.querySelectorAll('.bd-layer.is-active').forEach(function (l) { l.setAttribute('data-ready', ''); });
    var wanted = null;
    var show = function (key, shade) {
      var layer = layers[key];
      if (shade) backdrop.setAttribute('data-shade', shade);
      if (!layer || layer.classList.contains('is-active')) return;
      wanted = key;
      hydrate(layer);
      var img = layer.querySelector('img');
      var swap = function () {
        if (wanted !== key) return;
        Object.keys(layers).forEach(function (k) { layers[k].classList.toggle('is-active', k === key); });
      };
      if (!img || (img.complete && img.naturalWidth)) swap();
      else { img.addEventListener('load', swap, { once: true }); img.addEventListener('error', swap, { once: true }); }
    };
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-bg]'));
    var pick = function () {
      var mid = window.innerHeight / 2;
      var current = null;
      scenes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = el;
        else if (r.bottom <= mid) current = current || null;
      });
      if (!current) {
        // Abaixo da última secção com fotografia: mantém a mais recente já ultrapassada.
        for (var i = scenes.length - 1; i >= 0; i--) { if (scenes[i].getBoundingClientRect().top <= mid) { current = scenes[i]; break; } }
      }
      if (current) show(current.getAttribute('data-bg'), current.getAttribute('data-shade'));
    };
    if ('IntersectionObserver' in window) {
      var bo = new IntersectionObserver(function () { pick(); }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
      scenes.forEach(function (el) { bo.observe(el); });
    }
    // Salvaguarda para deslocamentos muito rápidos: reavalia uma vez por fotograma.
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; pick(); });
    }, { passive: true });
    pick();
    // Carregar as restantes fotografias depois da página, pela ordem em que aparecem.
    var later = function () {
      var order = [];
      scenes.forEach(function (el) { var k = el.getAttribute('data-bg'); if (order.indexOf(k) === -1) order.push(k); });
      order.forEach(function (k, i) { setTimeout(function () { hydrate(layers[k]); }, 250 * i); });
    };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
  }
})();
