// Eased wheel scrolling — the page trails the wheel and glides to a stop rather
// than tracking it exactly. Roughly 400ms to settle, so the weight is clearly
// felt without the page ever feeling like it is ignoring you.
//
// Only the wheel is intercepted. Keyboard, scrollbar dragging, find-in-page and
// anchor jumps all scroll the page directly, and the scroll listener resyncs
// from wherever they left it, so nothing else has to know this exists.

// Fraction of the remaining distance covered per 60fps frame. Lower is heavier:
// 0.22 settled in ~150ms and read as almost nothing, 0.09 is ~400ms.
const EASE = 0.09;
const FRAME = 1000 / 60;

export function initSmoothScroll() {
  const root = document.documentElement;

  // Touch devices already have momentum scrolling that feels better than
  // anything reimplemented here, and reduced-motion means no easing at all.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  let target = window.scrollY;
  let current = target;
  let frame = null;
  let last = 0;
  // The last position we wrote ourselves, so a scroll from anywhere else can be
  // told apart from our own.
  let written = target;

  const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

  const tick = (now) => {
    const dt = last ? now - last : FRAME;
    last = now;

    // Frame-rate independent lerp, so a 120Hz display eases at the same speed
    // as a 60Hz one rather than twice as fast.
    const t = 1 - (1 - EASE) ** (dt / FRAME);
    current += (target - current) * t;

    if (Math.abs(target - current) < 0.5) {
      current = target;
      frame = null;
    } else {
      frame = requestAnimationFrame(tick);
    }

    // `instant` matters: html has scroll-behavior:smooth for anchor links, and
    // without this every step of the lerp would get its own smooth animation.
    written = current;
    window.scrollTo({ top: current, left: 0, behavior: 'instant' });
  };

  const start = () => {
    if (frame !== null) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  window.addEventListener(
    'wheel',
    (event) => {
      // Leave pinch-zoom and horizontal gestures (trackpad swipes, the
      // carousel) to the browser.
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // The carousel takes shift + wheel as a sideways gesture and calls
      // preventDefault on it; without this the page would scroll as well.
      if (event.defaultPrevented) return;

      // Firefox reports deltas in lines, and some setups in pages.
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight
            : event.deltaY;

      event.preventDefault();
      target = Math.min(maxScroll(), Math.max(0, target + delta));
      start();
    },
    { passive: false },
  );

  const stop = () => {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
    target = window.scrollY;
    current = target;
    written = target;
  };

  // Pressing anything hands control back. A click that scrolls — the "top"
  // pill, the wordmark, a footer anchor — animates smoothly from wherever the
  // page currently is, so its early frames are indistinguishable from our own
  // and the check below can't catch it. Treating any press as an interruption
  // is both simpler and what a visitor expects.
  window.addEventListener('pointerdown', stop, { passive: true, capture: true });

  // Any scroll we didn't drive ourselves becomes the new starting point. That
  // covers the scrollbar, find-in-page and instant programmatic jumps, which
  // land somewhere we never wrote.
  window.addEventListener(
    'scroll',
    () => {
      if (frame !== null && Math.abs(window.scrollY - written) <= 2) return;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      target = window.scrollY;
      current = target;
      written = target;
    },
    { passive: true },
  );

  // The document can get shorter (a case study's images finish loading and
  // change nothing, but a resize can); keep the target inside the page.
  window.addEventListener('resize', () => {
    target = Math.min(target, maxScroll());
  });
}
