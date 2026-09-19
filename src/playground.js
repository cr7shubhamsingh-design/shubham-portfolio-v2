import { initTheme } from './theme.js';
import { initNavHome } from './nav.js';
import { initSmoothScroll } from './smooth-scroll.js';

initTheme();
initNavHome();
initSmoothScroll();

// Figma 308:4691 — a wrapped grid of 648x648 tiles, with two that run the full
// 1320 width. Everything is exported whole from the frame, so each tile carries
// its own fill and corner radius.
const TILE_COUNT = 46;

// Keyed by tile number; anything not listed is square.
const WIDE = {
  37: '1320 / 648',
  46: '1320 / 864',
};

const TILES = Array.from({ length: TILE_COUNT }, (_, i) => {
  const n = i + 1;
  const id = String(n).padStart(2, '0');
  return { src: `/playground-v1/pg-${id}.webp`, ratio: WIDE[n] || '1 / 1', wide: Boolean(WIDE[n]) };
});

// Fisher-Yates. Shuffled on every load, so the wall is never in the same order
// twice — including which tiles land beside the two full-width ones.
const shuffle = (items) => {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// The back pill points home so a shared link still works, but retraces history
// when the visitor came from the site — that restores wherever they left off,
// scroll position and all.
const backPill = document.getElementById('playground-back');

if (backPill) {
  const cameFromSite = (() => {
    if (!document.referrer) return false;
    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch (error) {
      return false;
    }
  })();

  backPill.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (cameFromSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
}

const grid = document.getElementById('playground');

if (grid) {
  const frag = document.createDocumentFragment();

  shuffle(TILES).forEach((tile, index) => {
    const figure = document.createElement('figure');
    figure.className = tile.wide ? 'playground__tile playground__tile--wide' : 'playground__tile';
    figure.style.aspectRatio = tile.ratio;

    const img = document.createElement('img');
    img.className = 'playground__img';
    img.src = tile.src;
    img.alt = '';
    // The first screenful is worth having immediately; the rest can wait.
    img.loading = index < 4 ? 'eager' : 'lazy';
    img.decoding = 'async';

    figure.appendChild(img);
    frag.appendChild(figure);
  });

  grid.appendChild(frag);
}
