/**
 * Editing chrome injected into the Builder's preview iframe (docs/theme_
 * aware_prd.md §24) — raw CSS/JS text, not a bundled module. It runs
 * unbundled inside the iframe document (see preview/+server.ts), so it can't
 * import anything; everything it needs is inlined here.
 *
 * This is purely a dashboard editing-UX concern layered on top of what the
 * API renders (block-content-renderer.ts's `data-cms-block-id` markers) — the
 * API stays a faithful renderer, this is the only place that turns those
 * markers into clickable, hoverable, insertable chrome.
 */

/**
 * `[data-cms-block-id]` wrappers exist purely so this script can find block
 * boundaries — `display: contents` removes them from the box tree entirely
 * (verified against every theme's CSS: no adjacent-sibling/first-child/
 * last-child selector in this codebase targets a block's root element), so a
 * theme's own layout is byte-for-byte what it would be without the wrapper.
 * Because a `display: contents` element has no box of its own, hover/
 * selection highlights can't be CSS outlines on the wrapper — this script
 * measures the wrapper's *children* instead and draws its own overlay.
 */
export const PREVIEW_EDITOR_STYLE = `
[data-cms-block-id] { display: contents; }
.cms-editor-overlay {
  position: absolute; pointer-events: none; box-sizing: border-box;
  z-index: 2147483001; border-radius: 2px;
}
.cms-editor-overlay--hover { border: 2px solid rgba(7,89,133,.5); background: rgba(7,89,133,.06); }
.cms-editor-overlay--selected { border: 2px solid #075985; box-shadow: 0 0 0 1px rgba(7,89,133,.25); }
.cms-editor-gap {
  position: absolute; left: 0; right: 0; height: 22px;
  display: flex; align-items: center; justify-content: center;
  z-index: 2147483002; pointer-events: auto;
}
.cms-editor-gap__line { position: absolute; left: 12px; right: 12px; height: 2px; background: #075985; opacity: 0; border-radius: 999px; }
.cms-editor-gap__btn {
  position: relative; width: 22px; height: 22px; border-radius: 999px; border: 0;
  background: #075985; color: #fff; cursor: pointer; opacity: 0;
  display: flex; align-items: center; justify-content: center; font: 600 15px/1 system-ui, sans-serif;
  transition: opacity .1s ease, transform .1s ease; transform: scale(.85);
}
.cms-editor-gap:hover .cms-editor-gap__line,
.cms-editor-gap:hover .cms-editor-gap__btn { opacity: 1; }
.cms-editor-gap:hover .cms-editor-gap__btn { transform: scale(1); }
body.cms-editor-mode-preview .cms-editor-overlay,
body.cms-editor-mode-preview .cms-editor-gap { display: none !important; }
`;

export const PREVIEW_EDITOR_SCRIPT = `
(function () {
  var mode = 'edit';
  var selectedId = null;
  var hoveredEl = null;

  function post(message) {
    window.parent.postMessage(message, '*');
  }

  function topLevelBlocks() {
    var all = document.querySelectorAll('[data-cms-block-id]');
    var result = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      // Skip a block nested inside another block's markup (not produced by
      // any theme today, but this keeps the rail-of-gaps math correct if
      // that ever changes rather than silently misbehaving).
      if (el.parentElement && el.parentElement.closest('[data-cms-block-id]')) continue;
      result.push(el);
    }
    return result;
  }

  // \`el\` itself has no box (display: contents) — union its children's rects instead.
  function unionRect(el) {
    var children = el.children;
    if (!children.length) return null;
    var top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
    for (var i = 0; i < children.length; i++) {
      var r = children[i].getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      top = Math.min(top, r.top); left = Math.min(left, r.left);
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    if (top === Infinity) return null;
    return { top: top, left: left, width: right - left, height: bottom - top };
  }

  function pageRect(rect) {
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }

  function placeOverlay(overlayEl, rect) {
    if (!rect) { overlayEl.style.display = 'none'; return; }
    var p = pageRect(rect);
    overlayEl.style.display = 'block';
    overlayEl.style.top = p.top + 'px';
    overlayEl.style.left = p.left + 'px';
    overlayEl.style.width = p.width + 'px';
    overlayEl.style.height = p.height + 'px';
  }

  var hoverOverlay = document.createElement('div');
  hoverOverlay.className = 'cms-editor-overlay cms-editor-overlay--hover';
  hoverOverlay.style.display = 'none';
  var selectionOverlay = document.createElement('div');
  selectionOverlay.className = 'cms-editor-overlay cms-editor-overlay--selected';
  selectionOverlay.style.display = 'none';

  function redrawSelection() {
    if (!selectedId) { placeOverlay(selectionOverlay, null); return; }
    var el = document.querySelector('[data-cms-block-id="' + cssEscape(selectedId) + '"]');
    placeOverlay(selectionOverlay, el ? unionRect(el) : null);
  }

  function cssEscape(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
  }

  document.addEventListener('mouseover', function (event) {
    if (mode !== 'edit') return;
    var el = event.target.closest ? event.target.closest('[data-cms-block-id]') : null;
    if (el === hoveredEl) return;
    hoveredEl = el;
    placeOverlay(hoverOverlay, el ? unionRect(el) : null);
  });
  document.addEventListener('mouseout', function (event) {
    if (mode !== 'edit') return;
    if (event.relatedTarget && hoveredEl && hoveredEl.contains(event.relatedTarget)) return;
    hoveredEl = null;
    placeOverlay(hoverOverlay, null);
  });

  // Capturing so this runs before any inner <a>/<button>/form in block
  // content can navigate/submit while editing — selecting a block must never
  // also trigger what it links to.
  document.addEventListener('click', function (event) {
    if (mode !== 'edit') return;
    var el = event.target.closest ? event.target.closest('[data-cms-block-id]') : null;
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    post({ source: 'cms-preview', type: 'cms:select-block', blockId: el.getAttribute('data-cms-block-id'), blockType: el.getAttribute('data-cms-block-type') });
  }, true);

  var gapEls = [];
  function rebuildGaps() {
    for (var i = 0; i < gapEls.length; i++) gapEls[i].remove();
    gapEls = [];

    var blocks = topLevelBlocks();
    var rects = [];
    for (var i = 0; i < blocks.length; i++) {
      var r = unionRect(blocks[i]);
      if (r) rects.push(pageRect(r));
    }
    if (!rects.length) return;

    var boundaries = [rects[0].top];
    for (var i = 0; i < rects.length - 1; i++) boundaries.push((rects[i].top + rects[i].height + rects[i + 1].top) / 2);
    boundaries.push(rects[rects.length - 1].top + rects[rects.length - 1].height);

    for (var i = 0; i < boundaries.length; i++) {
      var gap = document.createElement('div');
      gap.className = 'cms-editor-gap';
      gap.style.top = (boundaries[i] - 11) + 'px';
      var line = document.createElement('div');
      line.className = 'cms-editor-gap__line';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cms-editor-gap__btn';
      btn.textContent = '+';
      btn.setAttribute('aria-label', 'Sisipkan blok di sini');
      (function (index) {
        btn.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          post({ source: 'cms-preview', type: 'cms:insert-at', index: index });
        });
      })(i);
      gap.appendChild(line);
      gap.appendChild(btn);
      document.body.appendChild(gap);
      gapEls.push(gap);
    }
  }

  var resizeTimer;
  function scheduleRebuild() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      rebuildGaps();
      redrawSelection();
    }, 120);
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var msg = event.data;
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'cms:set-mode') {
      mode = msg.mode === 'preview' ? 'preview' : 'edit';
      document.body.classList.toggle('cms-editor-mode-preview', mode === 'preview');
      if (mode !== 'edit') { hoveredEl = null; placeOverlay(hoverOverlay, null); }
    } else if (msg.type === 'cms:set-selection') {
      selectedId = msg.blockId || null;
      redrawSelection();
    }
  });

  var throttledScrollPost = (function () {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last < 200) return;
      last = now;
      post({ source: 'cms-preview', type: 'cms:scroll', y: window.scrollY });
    };
  })();

  window.addEventListener('scroll', throttledScrollPost, { passive: true });
  window.addEventListener('resize', scheduleRebuild);

  function init() {
    document.body.appendChild(hoverOverlay);
    document.body.appendChild(selectionOverlay);
    rebuildGaps();

    var params = new URLSearchParams(window.location.search);
    var scrollY = Number(params.get('scrollY'));
    if (scrollY > 0) window.scrollTo(0, scrollY);

    post({ source: 'cms-preview', type: 'cms:ready' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', scheduleRebuild);
})();
`;
