// Runs the disc player's texture maths (disc-tex.js) off the main thread.
import { shellPixels, grainPixels, groovePixels, discPixels } from './disc-tex.js';

const JOBS = { shell: shellPixels, grain: grainPixels, groove: groovePixels, disc: discPixels };

self.onmessage = ({ data: { id, job, args } }) => {
  const out = JOBS[job](...args);
  self.postMessage({ id, out }, Object.values(out).map(a => a.buffer));
};
