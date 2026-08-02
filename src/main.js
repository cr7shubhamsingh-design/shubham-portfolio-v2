const DESIGNER_FRAMES = [
  '/designer-frames/frame-1-flat.svg',
  '/designer-frames/frame-2-rainbow.svg',
  '/designer-frames/frame-3-outline.svg',
  '/designer-frames/frame-4-navy.svg',
  '/designer-frames/frame-5-cream.svg',
];

const cycleImg = document.getElementById('designer-cycle');

if (cycleImg) {
  DESIGNER_FRAMES.forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  let frameIndex = 0;

  const showFrame = (src) => {
    cycleImg.classList.add('is-entering');
    cycleImg.style.transitionDuration = '0ms';
    cycleImg.src = src;
    void cycleImg.offsetWidth;
    cycleImg.style.transitionDuration = '';
    cycleImg.classList.remove('is-entering');
  };

  setInterval(() => {
    frameIndex = (frameIndex + 1) % DESIGNER_FRAMES.length;
    showFrame(DESIGNER_FRAMES[frameIndex]);
  }, 2000);
}
