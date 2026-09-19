// Shared theme wiring. Both the homepage and the case-study template mount the
// same nav pill, so this lives in one place rather than being duplicated.
const THEME_ICONS = {
  light: '/icons/moon.svg',
  dark: '/icons/moon-dark.svg',
};

/**
 * @param {(theme: 'light' | 'dark') => void} onThemeChange
 *   Called after each theme application — the homepage uses it to swap the
 *   hero's "designer" frames, which only exist on that page.
 */
export function initTheme(onThemeChange = () => {}) {
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themedIcons = document.querySelectorAll('[data-icon-light]');

  if (!themeToggle || !themeToggleIcon) return;

  const root = document.documentElement;

  // A View Transition crossfades one snapshot of the whole page into the next,
  // so colours, icons and images all change on a single timeline. Where it's
  // available the CSS colour transitions are switched off (see .has-view-
  // transitions in the stylesheet) — otherwise both would run and fight.
  const canViewTransition =
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canViewTransition) root.classList.add('has-view-transitions');

  // Preload the opposite theme's icons so a swap never waits on the network —
  // that wait was the most visible source of icons lagging behind the colours.
  const preloadIcons = () => {
    const sources = [THEME_ICONS.light, THEME_ICONS.dark];
    themedIcons.forEach((img) => {
      sources.push(img.dataset.iconLight, img.dataset.iconDark);
    });
    sources.filter(Boolean).forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });
  };

  // Everything the theme touches is written in one synchronous pass, so no
  // element can land a frame later than any other.
  const commit = (theme) => {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    themeToggleIcon.src = THEME_ICONS[theme];
    themedIcons.forEach((img) => {
      img.src = theme === 'dark' ? img.dataset.iconDark : img.dataset.iconLight;
    });

    onThemeChange(theme);
  };

  const applyTheme = (theme, animate) => {
    if (!animate) {
      commit(theme);
      return;
    }

    // .theme-instant kills every live transition for the flip. Colour tokens
    // already change in 0ms, but a couple of hover rules carry their own
    // hardcoded easing and would otherwise settle a beat after everything else.
    if (canViewTransition) {
      const transition = document.startViewTransition(() => {
        root.classList.add('theme-instant');
        commit(theme);
      });
      transition.finished.finally(() => root.classList.remove('theme-instant'));
      return;
    }

    // No View Transitions (Firefox today): flip instantly. Still perfectly
    // synchronised, just without the crossfade.
    root.classList.add('theme-instant');
    commit(theme);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('theme-instant'));
    });
  };

  preloadIcons();

  const currentTheme =
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme, false);

  themeToggle.addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next, true);
  });
}
