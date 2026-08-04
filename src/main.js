const LOADING_FRAMES = [
  '/loading-frames/frame-1.svg',
  '/loading-frames/frame-2.svg',
  '/loading-frames/frame-3.svg',
  '/loading-frames/frame-4.svg',
  '/loading-frames/frame-5.svg',
  '/loading-frames/frame-6.svg',
];

const LOADING_FRAME_INTERVAL_MS = 300;
const LOADING_TOTAL_MS = 1700;

const loadingScreen = document.getElementById('loading-screen');
const loadingImg = document.getElementById('loading-cycle');
const mainScreen = document.getElementById('main-screen');

if (loadingScreen && loadingImg && mainScreen) {
  LOADING_FRAMES.forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  let loadingFrameIndex = 0;
  const loadingCycleId = setInterval(() => {
    loadingFrameIndex = (loadingFrameIndex + 1) % LOADING_FRAMES.length;
    loadingImg.classList.add('is-fading');
    setTimeout(() => {
      loadingImg.src = LOADING_FRAMES[loadingFrameIndex];
      loadingImg.classList.remove('is-fading');
    }, 100);
  }, LOADING_FRAME_INTERVAL_MS);

  setTimeout(() => {
    clearInterval(loadingCycleId);
    loadingScreen.classList.add('is-hidden');
    mainScreen.classList.add('is-visible');
  }, LOADING_TOTAL_MS);
}

const DESIGNER_FRAMES_LIGHT = [
  '/designer-frames/frame-1-flat.svg',
  '/designer-frames/frame-2-rainbow.svg',
  '/designer-frames/frame-3-outline.svg',
  '/designer-frames/frame-4-navy.svg',
  '/designer-frames/frame-5-cream.svg',
];

const DESIGNER_FRAMES_DARK = [
  '/designer-frames-dark/frame-1-flat.svg',
  '/designer-frames-dark/frame-2-rainbow.svg',
  '/designer-frames-dark/frame-3-outline.svg',
  '/designer-frames-dark/frame-4-orange.svg',
  '/designer-frames-dark/frame-5-cream-outline.svg',
];

const DESIGNER_CYCLE_INTERVAL_MS = 1500;

const cycleImg = document.getElementById('designer-cycle');

let setDesignerTheme = () => {};

if (cycleImg) {
  [...DESIGNER_FRAMES_LIGHT, ...DESIGNER_FRAMES_DARK].forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  let activeFrames = DESIGNER_FRAMES_LIGHT;
  let frameIndex = 0;

  const showFrame = (src) => {
    cycleImg.classList.add('is-entering');
    cycleImg.style.transitionDuration = '0ms';
    cycleImg.src = src;
    void cycleImg.offsetWidth;
    cycleImg.style.transitionDuration = '';
    cycleImg.classList.remove('is-entering');
  };

  setDesignerTheme = (theme) => {
    activeFrames = theme === 'dark' ? DESIGNER_FRAMES_DARK : DESIGNER_FRAMES_LIGHT;
    cycleImg.src = activeFrames[frameIndex];
  };

  setInterval(() => {
    frameIndex = (frameIndex + 1) % activeFrames.length;
    showFrame(activeFrames[frameIndex]);
  }, DESIGNER_CYCLE_INTERVAL_MS);
}

const THEME_ICONS = {
  light: '/icons/moon.svg',
  dark: '/icons/moon-dark.svg',
};

const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const themedIcons = document.querySelectorAll('[data-icon-light]');

if (themeToggle && themeToggleIcon) {
  const swappableIcons = [themeToggleIcon, ...themedIcons];

  const applyTheme = (theme, animate) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const swap = () => {
      themeToggleIcon.src = THEME_ICONS[theme];
      themedIcons.forEach((img) => {
        img.src = theme === 'dark' ? img.dataset.iconDark : img.dataset.iconLight;
      });
    };

    if (animate) {
      swappableIcons.forEach((img) => img.classList.add('is-swapping'));
      setTimeout(() => {
        swap();
        swappableIcons.forEach((img) => img.classList.remove('is-swapping'));
      }, 220);
    } else {
      swap();
    }

    setDesignerTheme(theme);
  };

  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme, false);

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next, true);
  });
}

const CASE_STUDIES = [
  { title: 'Thrust', subtitle: 'Mobile & Web Design', icon: '/case-icons/thrust.svg', href: '#' },
  { title: 'Camb', subtitle: 'Mobile & Web Design', icon: '/case-icons/camb.svg', href: '#' },
  { title: 'Hobbes', subtitle: 'Mobile & Web Design', icon: '/case-icons/hobbes.svg', href: '#' },
  { title: 'Digit', subtitle: 'Mobile & Web Design', icon: '/case-icons/digit.svg', href: '#' },
];

const caseViewport = document.getElementById('case-viewport');
const caseTrack = document.getElementById('case-track');

if (caseViewport && caseTrack) {
  const realCards = Array.from(caseTrack.children);
  const cardCount = realCards.length;

  const leadingClone = realCards[cardCount - 1].cloneNode(true);
  const trailingClone = realCards[0].cloneNode(true);
  leadingClone.setAttribute('aria-hidden', 'true');
  trailingClone.setAttribute('aria-hidden', 'true');
  caseTrack.insertBefore(leadingClone, realCards[0]);
  caseTrack.appendChild(trailingClone);

  const cards = Array.from(caseTrack.children);

  const caseIcon = document.getElementById('case-icon');
  const caseTitle = document.getElementById('case-title');
  const caseSubtitle = document.getElementById('case-subtitle');
  const caseText = document.querySelector('.case-studies__text');
  const caseLink = document.getElementById('case-link');

  const realIndexForPos = (pos) => ((pos - 1) % cardCount + cardCount) % cardCount;

  let visualPos = 1;
  let activeIndex = 0;
  let dragging = false;
  let dragStartX = 0;
  let baseOffset = 0;
  let dragOffset = 0;

  // Measured from actual rendered positions (not parsed from computed CSS strings)
  // so this can't break on browsers that report gap/columnGap inconsistently.
  const getCardMetrics = () => {
    const rect0 = cards[0].getBoundingClientRect();
    const rect1 = cards[1].getBoundingClientRect();
    const cardWidth = rect0.width;
    const step = rect1.left - rect0.left;
    const gap = step - cardWidth;
    return { cardWidth, gap: Number.isFinite(gap) ? gap : 16 };
  };

  const offsetForPos = (pos) => {
    const { cardWidth, gap } = getCardMetrics();
    const viewportWidth = caseViewport.getBoundingClientRect().width;
    const paddingLeft = parseFloat(getComputedStyle(caseViewport).paddingLeft) || 0;
    const offset = viewportWidth / 2 - cardWidth / 2 - paddingLeft - pos * (cardWidth + gap);
    return Number.isFinite(offset) ? offset : 0;
  };

  const applyTransform = (offset, animate) => {
    caseTrack.style.transition = animate ? 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    caseTrack.style.transform = `translateX(${offset}px)`;
  };

  const updateInfo = (animate) => {
    const study = CASE_STUDIES[activeIndex];
    if (!study) return;
    const apply = () => {
      if (caseIcon) caseIcon.src = study.icon;
      if (caseTitle) caseTitle.textContent = study.title;
      if (caseSubtitle) caseSubtitle.textContent = study.subtitle;
      if (caseLink) caseLink.href = study.href;
    };
    if (!animate) {
      apply();
      return;
    }
    caseText?.classList.add('is-swapping');
    caseIcon?.classList.add('is-swapping');
    setTimeout(() => {
      apply();
      caseText?.classList.remove('is-swapping');
      caseIcon?.classList.remove('is-swapping');
    }, 220);
  };

  // After sliding onto a cloned end card, jump instantly (no transition) to the
  // matching real card at the opposite end so the loop reads as continuous.
  const settleLoopBoundary = () => {
    if (visualPos === 0) {
      visualPos = cardCount;
      applyTransform(offsetForPos(visualPos), false);
    } else if (visualPos === cards.length - 1) {
      visualPos = 1;
      applyTransform(offsetForPos(visualPos), false);
    }
  };

  const goToPos = (pos, animate = true) => {
    const previousRealIndex = activeIndex;
    visualPos = pos;
    activeIndex = realIndexForPos(visualPos);
    applyTransform(offsetForPos(visualPos), animate);
    const changed = activeIndex !== previousRealIndex;
    updateInfo(animate && changed);
    if (animate) {
      setTimeout(settleLoopBoundary, 460);
    } else {
      settleLoopBoundary();
    }
  };

  goToPos(1, false);
  window.addEventListener('load', () => goToPos(visualPos, false));
  window.addEventListener('resize', () => goToPos(visualPos, false));

  caseViewport.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragOffset = 0;
    dragStartX = event.clientX;
    baseOffset = offsetForPos(visualPos);
    caseTrack.style.transition = 'none';
    try {
      caseViewport.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some browsers reject capture for certain pointer types; the window-level
      // fallback listeners still guarantee the drag resolves correctly.
    }
  });

  caseViewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragOffset = event.clientX - dragStartX;
    caseTrack.style.transform = `translateX(${baseOffset + dragOffset}px)`;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    const SWIPE_THRESHOLD = 60;
    if (dragOffset < -SWIPE_THRESHOLD) {
      goToPos(visualPos + 1);
    } else if (dragOffset > SWIPE_THRESHOLD) {
      goToPos(visualPos - 1);
    } else {
      goToPos(visualPos);
    }
  };

  caseViewport.addEventListener('pointerup', endDrag);
  caseViewport.addEventListener('pointercancel', endDrag);
  caseViewport.addEventListener('pointerleave', () => {
    if (dragging) endDrag();
  });

  // Safety net: if a pointerup/cancel is ever missed on the viewport itself
  // (seen on some touch browsers when capture is lost mid-gesture), this
  // guarantees the drag still resolves instead of leaving the track stuck
  // at a mid-drag, uncentered offset.
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
}
