// On the homepage the wordmark returns to the top of the page. On a case study
// it is a real link to the homepage instead, so there is nothing to wire up —
// leaving it as an anchor keeps middle-click and open-in-new-tab working.
export function initNavHome() {
  const home = document.querySelector('.site-nav__home');
  if (!home) return;
  if (home.tagName === 'A') return;

  home.addEventListener('click', () => {
    // No `behavior` override on purpose: the global scroll-behavior decides
    // smooth vs instant, which already respects prefers-reduced-motion.
    window.scrollTo({ top: 0, left: 0 });
  });
}
