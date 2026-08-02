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
    frameIndex = 0;
    showFrame(activeFrames[frameIndex]);
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
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    themeToggleIcon.src = THEME_ICONS[theme];
    themedIcons.forEach((img) => {
      img.src = theme === 'dark' ? img.dataset.iconDark : img.dataset.iconLight;
    });
    setDesignerTheme(theme);
  };

  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme);

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}
