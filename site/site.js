// revelaslides.com: the light/dark switch (remembered in this browser), the
// header's line once the page scrolls, and the prices' monthly/yearly switch.
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
  var billing = document.querySelector('.billing:not(.currency)'), money = document.querySelector('.billing.currency');
  if (billing && money) {
    var period = 'year', cur = 'EUR';
    try { cur = localStorage.getItem('currency') || ''; } catch (e) {}
    if (cur !== 'EUR' && cur !== 'USD') {
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      cur = /^(Europe|Atlantic\/Canary|Africa\/Ceuta)/.test(tz) ? 'EUR' : 'USD';
    }
    // (Prices are before taxes. In euros the page shows the final price with Spain's VAT — the
    // law asks for it towards consumers — and the price before it underneath; Stripe adds each
    // country's VAT when paying. Dollars: before taxes, added when paying.)
    var VAT = 0.21;
    var num = function (v, dec) { var s = dec ? v.toFixed(2) : String(v); return cur === 'EUR' ? s.replace('.', ',') : s; };
    var eur = function (v) { var f = Math.round(+v * (1 + VAT) * 100) / 100; return num(f, f % 1 !== 0) + ' €'; };
    var amt = function (v) { return cur === 'EUR' ? eur(v) : '$' + num(+v, (+v) % 1 !== 0); };
    var cents = function (v) { return num(+v, false) + (cur === 'EUR' ? (+v === 1 ? ' céntimo' : ' céntimos') + ' + IVA' : (+v === 1 ? ' centavo' : ' centavos')); };
    var paint = function () {
      billing.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.period === period)); });
      money.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.currency === cur)); });
      document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = el.dataset[period].replace(/\[([\d.]+)\]/g, function (m, v) { return amt(v); }); });
      document.querySelectorAll('.amt').forEach(function (el) { el.textContent = amt(el.dataset.v); });
      document.querySelectorAll('.cent').forEach(function (el) { el.textContent = cents(el.dataset.v); });
      document.querySelectorAll('.vat').forEach(function (el) { el.textContent = cur === 'EUR' ? el.dataset[period].replace(/\{([\d.]+)\}/, function (m, v) { return num(+v, false) + ' € + IVA'; }) : ''; el.hidden = cur !== 'EUR'; });
      document.querySelectorAll('[data-tax-eur]').forEach(function (el) { el.textContent = el.dataset[cur === 'EUR' ? 'taxEur' : 'taxUsd']; });
      document.querySelectorAll('[data-buy-month]').forEach(function (a) { a.href = a.dataset[period === 'month' ? 'buyMonth' : 'buyYear']; });
    };
    billing.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { period = b.dataset.period; paint(); } });
    money.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cur = b.dataset.currency; try { localStorage.setItem('currency', cur); } catch (x) {} paint(); });
    paint();
  }
})();
