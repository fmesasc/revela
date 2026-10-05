// revelaslides.com: the light/dark switch (remembered in this browser), the
// header's line once the page scrolls, the prices' monthly/yearly switch and the languages.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme');
  if (btn) btn.addEventListener('click', function () {
    var dark = root.dataset.theme !== 'dark';
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    btn.setAttribute('aria-pressed', String(dark));
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
  if (btn) btn.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));

  var head = document.querySelector('header.top');
  var onScroll = function () { if (head) head.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Prices: the period (monthly/yearly) and the currency (euros with VAT, dollars before
  // taxes: the same figures). [n] in a [data-month]/[data-year] text is an amount; links take
  // the product. The currency starts from where the browser is (dollars outside Europe).
  // (Everything is charged in euros; a currency switch, if a page still has one, is honoured.)
  var billing = document.querySelector('.billing:not(.currency)'), money = document.querySelector('.billing.currency');
  // (Also on pages with prices but no switch, as the home page: the yearly figures, in euros.)
  if (billing || document.querySelector('.amt, [data-month]')) {
    var period = 'year', cur = 'EUR';
    if (money) { try { cur = localStorage.getItem('currency') || 'EUR'; } catch (e) {} if (cur !== 'USD') cur = 'EUR'; }
    // (Prices are before taxes. In euros the page shows the final price with Spain's VAT — the
    // law asks for it towards consumers — and the price before it underneath; Stripe adds each
    // country's VAT when paying. Dollars: before taxes, added when paying.)
    var VAT = 0.21, lang = root.lang || 'es';
    // Amounts as each language writes them (8 €, €8, 8,50 €…); the words by the cents and the VAT, too.
    var WORDS = { es: ['céntimo', 'céntimos', 'centavo', 'centavos', '+ IVA'], en: ['cent', 'cents', 'cent', 'cents', '+ VAT'], fr: ['centime', 'centimes', 'cent', 'cents', 'HT'],
      de: ['Cent', 'Cent', 'Cent', 'Cent', 'zzgl. MwSt.'], it: ['centesimo', 'centesimi', 'centesimo', 'centesimi', '+ IVA'], pt: ['cêntimo', 'cêntimos', 'cêntimo', 'cêntimos', '+ IVA'],
      ca: ['cèntim', 'cèntims', 'centau', 'centaus', '+ IVA'] }[lang] || ['cent', 'cents', 'cent', 'cents', '+ VAT'];
    var fmt = function (v, c) { var d = v % 1 !== 0; try { return new Intl.NumberFormat(lang, { style: 'currency', currency: c, minimumFractionDigits: d ? 2 : 0, maximumFractionDigits: d ? 2 : 0 }).format(v); } catch (e) { return v + (c === 'EUR' ? ' €' : ' $'); } };
    var plain = function (v) { try { return new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(v); } catch (e) { return String(v); } };
    var eur = function (v) { return fmt(Math.round(+v * (1 + VAT) * 100) / 100, 'EUR'); };
    var amt = function (v) { return cur === 'EUR' ? eur(v) : fmt(+v, 'USD'); };
    var cents = function (v) { var one = +v === 1, w = cur === 'EUR' ? (one ? WORDS[0] : WORDS[1]) + ' ' + WORDS[4] : (one ? WORDS[2] : WORDS[3]); return plain(+v) + ' ' + w; };
    var paint = function () {
      if (billing) billing.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.period === period)); });
      if (money) money.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.currency === cur)); });
      document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = el.dataset[period].replace(/\[([\d.]+)\]/g, function (m, v) { return amt(v); }); });
      document.querySelectorAll('.amt').forEach(function (el) { el.textContent = amt(el.dataset.v); });
      document.querySelectorAll('.cent').forEach(function (el) { el.textContent = cents(el.dataset.v); });
      document.querySelectorAll('.vat').forEach(function (el) { el.textContent = cur === 'EUR' ? el.dataset[period].replace(/\{([\d.]+)\}/, function (m, v) { return fmt(+v, 'EUR') + ' ' + WORDS[4]; }) : ''; el.hidden = cur !== 'EUR'; });
      document.querySelectorAll('[data-tax-eur]').forEach(function (el) { el.textContent = el.dataset[cur === 'EUR' ? 'taxEur' : 'taxUsd']; });
      document.querySelectorAll('[data-buy-month]').forEach(function (a) { a.href = a.dataset[period === 'month' ? 'buyMonth' : 'buyYear']; });
    };
    if (billing) billing.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { period = b.dataset.period; paint(); } });
    if (money) money.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cur = b.dataset.currency; try { localStorage.setItem('currency', cur); } catch (x) {} paint(); });
    paint();
  }

  // Languages: choosing one in the footer is remembered; someone whose browser is in another
  // of the site's languages (and hasn't chosen) is offered that version, in that language —
  // offered, not sent there: search engines and links keep each address as it is.
  var langs = document.querySelector('.site-langs');
  if (langs) {
    langs.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a) try { localStorage.setItem('site-lang', a.lang); } catch (x) {} });
    var chosen = ''; try { chosen = localStorage.getItem('site-lang') || ''; } catch (e) {}
    var want = (navigator.languages && navigator.languages[0] || navigator.language || '').slice(0, 2).toLowerCase();
    var link = !chosen && want !== root.lang && langs.querySelector('a[lang="' + want + '"]');
    if (link) {
      var bar = document.createElement('div'); bar.className = 'lang-hint'; bar.lang = want;
      var p = document.createElement('span'); p.textContent = link.dataset.suggest;
      var go = document.createElement('a'); go.href = link.getAttribute('href') + location.hash; go.textContent = link.dataset.go;
      go.addEventListener('click', function () { try { localStorage.setItem('site-lang', want); } catch (x) {} });
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', '×'); x.textContent = '×';
      x.addEventListener('click', function () { bar.remove(); try { localStorage.setItem('site-lang', root.lang); } catch (e) {} });
      bar.append(p, go, x); document.body.prepend(bar);
    }
  }

  // The live presentation on the home page: loaded once the page is (the picture of the
  // editor meanwhile, and instead of it for whoever asked to save data).
  // Phones and tablets (touch): the picture, and a button that opens it full screen instead —
  // Safari on iOS sizes a page inside another one by its content, not by its box.
  var live = document.querySelector('.live iframe[data-src]'), touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  if (live && touch) { live.remove(); var play = document.querySelector('.live-play'); if (play) play.hidden = false; }
  else if (live && !(navigator.connection && navigator.connection.saveData)) {
    var start = function () {
      live.addEventListener('load', function () { setTimeout(function () { live.parentNode.classList.add('on'); }, 700); });
      live.src = live.dataset.src;
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
  }

  // A link to a question (support#offline, from the editor's command search): it opens.
  var openAsked = function () { var d = location.hash && document.getElementById(location.hash.slice(1)); if (d && d.tagName === 'DETAILS') d.open = true; };
  openAsked(); window.addEventListener('hashchange', openAsked);
})();
