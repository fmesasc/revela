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

  // Prices: each [data-month]/[data-year] pair shows the period chosen; links take the product.
  var billing = document.querySelector('.billing');
  if (billing) {
    var set = function (period) {
      billing.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.period === period)); });
      document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = el.dataset[period]; });
      document.querySelectorAll('[data-buy-month]').forEach(function (a) { a.href = a.dataset[period === 'month' ? 'buyMonth' : 'buyYear']; });
    };
    billing.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) set(b.dataset.period); });
    set('year');
  }
})();
