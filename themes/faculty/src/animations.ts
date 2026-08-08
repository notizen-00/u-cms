/**
 * Vanilla JS, no dependencies (pure SSR — no Svelte hydration bundle ships
 * to the browser). Two small enhancements:
 *  1. Scroll-reveal: toggles `.is-visible` on `.reveal` elements once they
 *     scroll into view (see `main.css`'s `.reveal` rules).
 *  2. Hero video: fades the `<video>` in once it can actually play (avoids
 *     an abrupt pop-in on slow connections — the poster image shows until
 *     then) and quietly falls back to the poster if playback fails, rather
 *     than leaving a broken/blank hero.
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

export const HERO_VIDEO_SCRIPT = `
(function () {
  var video = document.querySelector('.hero-video');
  if (!video) return;
  video.addEventListener('canplay', function () { video.classList.add('is-ready'); });
  video.addEventListener('error', function () { video.classList.remove('is-ready'); video.style.display = 'none'; });
})();
`;
