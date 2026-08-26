/**
 * Vanilla JS, no dependencies (pure SSR — no Svelte hydration bundle ships to
 * the browser). Scroll-reveal: toggles `.is-visible` on `.reveal` elements
 * once they scroll into view (see base.css's `.reveal` rules).
 */
export const SCROLL_REVEAL_SCRIPT = `
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) { observer.observe(el); });
})();
`;

/**
 * Fades the hero `<video>` in once it can actually play (avoids an abrupt
 * pop-in on slow connections — the poster image shows until then) and
 * quietly falls back to the poster if playback fails, rather than leaving a
 * broken/blank hero.
 */
export const HERO_VIDEO_SCRIPT = `
(function () {
  var video = document.querySelector('.hero-video');
  if (!video) return;
  video.addEventListener('canplay', function () { video.classList.add('is-ready'); });
  video.addEventListener('error', function () { video.classList.remove('is-ready'); video.style.display = 'none'; });
})();
`;

/**
 * Header search: a modal, not a navigation to /news/. Every published page
 * is static HTML with no client bundle (see svelte-site-renderer.ts's own
 * doc comment), so there's no backend to query at runtime — instead
 * Layout.svelte embeds the site's whole news list as `window.__NEWS_SEARCH_INDEX__`
 * (see its `searchIndex`/`safeJsonScript`) and this script filters that
 * array in the browser as the visitor types. Opening the modal with an empty
 * query shows the index as-is (already newest-first) so it doubles as a
 * "berita terbaru" quick-list.
 */
export const SEARCH_MODAL_SCRIPT = `
(function () {
  var modal = document.querySelector('[data-search-modal]');
  var openBtn = document.querySelector('[data-search-open]');
  if (!modal || !openBtn) return;
  var closeEls = modal.querySelectorAll('[data-search-close]');
  var input = modal.querySelector('[data-search-input]');
  var results = modal.querySelector('[data-search-results]');
  var index = Array.isArray(window.__NEWS_SEARCH_INDEX__) ? window.__NEWS_SEARCH_INDEX__ : [];
  var lastFocused = null;
  var closeTimer = null;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderResults(list, query) {
    if (list.length === 0) {
      results.innerHTML = '<div class="search-modal__empty">' +
        (query ? 'Tidak ada berita yang cocok dengan &ldquo;' + escapeHtml(query) + '&rdquo;.' : 'Belum ada berita.') +
        '</div>';
      return;
    }
    results.innerHTML =
      '<div class="search-modal__label">' + (query ? 'Hasil pencarian' : 'Berita terbaru') + '</div>' +
      list.map(function (item) {
        return '<a class="search-result" href="/news/' + item.s + '/">' +
          (item.i ? '<span class="search-result__thumb"><img src="' + escapeHtml(item.i) + '" alt="" loading="lazy"></span>' : '') +
          '<span class="search-result__body">' +
            '<span class="search-result__title">' + escapeHtml(item.t) + '</span>' +
            (item.d ? '<span class="search-result__date">' + escapeHtml(item.d) + '</span>' : '') +
          '</span>' +
        '</a>';
      }).join('');
  }

  function runSearch(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      renderResults(index.slice(0, 8), '');
      return;
    }
    var matches = index.filter(function (item) {
      return (item.t && item.t.toLowerCase().indexOf(q) !== -1) ||
        (item.e && item.e.toLowerCase().indexOf(q) !== -1) ||
        (item.c && item.c.toLowerCase().indexOf(q) !== -1);
    }).slice(0, 20);
    renderResults(matches, query);
  }

  function openModal() {
    if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
    lastFocused = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-modal-open');
    openBtn.setAttribute('aria-expanded', 'true');
    input.value = '';
    runSearch('');
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      input.focus();
    });
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('search-modal-open');
    openBtn.setAttribute('aria-expanded', 'false');
    closeTimer = window.setTimeout(function () { modal.setAttribute('aria-hidden', 'true'); }, 220);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  openBtn.addEventListener('click', function (event) {
    event.preventDefault();
    openModal();
  });
  closeEls.forEach(function (el) { el.addEventListener('click', closeModal); });
  input.addEventListener('input', function () { runSearch(input.value); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();
`;
