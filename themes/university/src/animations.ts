/**
 * Vanilla JS, no dependencies (this is pure SSR — no Svelte hydration bundle
 * ships to the browser, so any interactivity has to be plain JS like this).
 * Toggles `.is-visible` on any `.reveal` element once it scrolls into view;
 * `main.css`'s `.reveal`/`.reveal.is-visible` rules do the actual fade/slide
 * transition. Falls back to marking everything visible immediately if
 * `IntersectionObserver` isn't available, so content is never stuck hidden.
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
