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

  setInterval(() => {
    frameIndex = (frameIndex + 1) % DESIGNER_FRAMES.length;
    cycleImg.classList.add('is-fading');
    setTimeout(() => {
      cycleImg.src = DESIGNER_FRAMES[frameIndex];
      cycleImg.classList.remove('is-fading');
    }, 150);
  }, 1000);
}
