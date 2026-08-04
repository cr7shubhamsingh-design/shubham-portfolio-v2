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
  const cards = Array.from(caseTrack.children);
  const caseIcon = document.getElementById('case-icon');
  const caseTitle = document.getElementById('case-title');
  const caseSubtitle = document.getElementById('case-subtitle');
  const caseText = document.querySelector('.case-studies__text');
  const caseLink = document.getElementById('case-link');

  let activeIndex = 0;
  let dragging = false;
  let dragStartX = 0;
  let baseOffset = 0;
  let dragOffset = 0;

  const getCardMetrics = () => {
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(caseTrack).columnGap || '16');
    return { cardWidth, gap };
  };

  const offsetForIndex = (index) => {
    const { cardWidth, gap } = getCardMetrics();
    const viewportWidth = caseViewport.getBoundingClientRect().width;
    const paddingLeft = parseFloat(getComputedStyle(caseViewport).paddingLeft) || 0;
    return viewportWidth / 2 - cardWidth / 2 - paddingLeft - index * (cardWidth + gap);
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

  const goTo = (index, animate = true) => {
    const next = Math.min(Math.max(index, 0), cards.length - 1);
    const changed = next !== activeIndex;
    activeIndex = next;
    applyTransform(offsetForIndex(activeIndex), animate);
    updateInfo(animate && changed);
  };

  goTo(0, false);
  window.addEventListener('load', () => goTo(activeIndex, false));
  window.addEventListener('resize', () => goTo(activeIndex, false));

  caseViewport.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragOffset = 0;
    dragStartX = event.clientX;
    baseOffset = offsetForIndex(activeIndex);
    caseTrack.style.transition = 'none';
    caseViewport.setPointerCapture(event.pointerId);
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
      goTo(activeIndex + 1);
    } else if (dragOffset > SWIPE_THRESHOLD) {
      goTo(activeIndex - 1);
    } else {
      goTo(activeIndex);
    }
  };

  caseViewport.addEventListener('pointerup', endDrag);
  caseViewport.addEventListener('pointercancel', endDrag);
  caseViewport.addEventListener('pointerleave', () => {
    if (dragging) endDrag();
  });
}
