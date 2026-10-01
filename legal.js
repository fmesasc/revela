// The legal pages: one language at a time (the address's #es/#ca/#en, or one
// chosen before, or the browser's), the header and footer in that language, an
// index of the sections at the side, and the website's dark mode if chosen there.
(function () {
  var root = document.documentElement;
  try { if (localStorage.getItem('theme') === 'dark') root.dataset.theme = 'dark'; } catch (e) {}
  var arts = [].slice.call(document.querySelectorAll('main article[lang]'));
  if (!arts.length) return;
  var langs = arts.map(function (a) { return a.lang; });
  var buttons = [].slice.call(document.querySelectorAll('.langs button'));
  buttons.forEach(function (b) { if (langs.indexOf(b.dataset.lang) < 0) b.remove(); });
  var toc = document.querySelector('.toc ol');

  // Which language: the address (a language, or a section inside one), else saved, else the browser's.
  var pick = function () {
    var h = decodeURIComponent(location.hash.slice(1));
    if (langs.indexOf(h) >= 0) return h;
    var el = h && document.getElementById(h), art = el && el.closest && el.closest('article[lang]');
    if (art) return art.lang;
    var saved = ''; try { saved = localStorage.getItem('legal-lang') || ''; } catch (e) {}
    if (langs.indexOf(saved) >= 0) return saved;
    var nav = (navigator.language || 'es').slice(0, 2);
    if (langs.indexOf(nav) >= 0) return nav;
    return nav === 'es' || nav === 'gl' || nav === 'eu' ? 'es' : langs.indexOf('en') >= 0 ? 'en' : langs[0];
  };

  var show = function (lang, save) {
    arts.forEach(function (a) { a.hidden = a.lang !== lang; });
    root.lang = lang;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    // The header's and footer's words, in that language.
    document.querySelectorAll('[data-es]').forEach(function (el) { var t = el.getAttribute('data-' + lang) || el.getAttribute('data-es'); if (t) el.textContent = t; });
    var art = arts.filter(function (a) { return a.lang === lang; })[0], h1 = art.querySelector('h1');
    if (h1) document.title = h1.textContent + ' · Revela';
    // The index: the article's sections (each gets an id if it has none).
    if (toc) {
      toc.innerHTML = '';
      [].slice.call(art.querySelectorAll('h2')).forEach(function (h, i) {
        if (!h.id) h.id = lang + '-' + (i + 1);
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + h.id; a.textContent = h.textContent.replace(/^\d+\.\s*/, '');
        li.appendChild(a); toc.appendChild(li);
      });
      spy();
    }
    if (save) { try { localStorage.setItem('legal-lang', lang); } catch (e) {} history.replaceState(null, '', '#' + lang); window.scrollTo(0, 0); }
  };

  // The section being read, marked in the index.
  var spy = function () {
    if (!toc) return;
    var links = [].slice.call(toc.querySelectorAll('a')), cur = null;
    links.forEach(function (a) { var h = document.getElementById(a.getAttribute('href').slice(1)); if (h && h.getBoundingClientRect().top < 140) cur = a; });
    links.forEach(function (a) { a.classList.toggle('on', a === (cur || links[0])); });
  };
  window.addEventListener('scroll', spy, { passive: true });

  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.lang, true); }); });
  window.addEventListener('hashchange', function () { var l = pick(); if (!document.querySelector('article[lang="' + l + '"]:not([hidden])')) show(l, false); });
  var theme = document.querySelector('.theme');
  if (theme) theme.addEventListener('click', function () {
    var dark = root.dataset.theme !== 'dark';
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
  show(pick(), false);
  if (location.hash.length > 3) { var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }
})();
