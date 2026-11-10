// Pixel maths for the disc player's procedural textures: pure functions on typed
// arrays (RGBA, bottom row first, i.e. already flipped for WebGL: the browser would
// otherwise flip them on the main thread at upload), so they can run in a worker (disc-tex-worker.js)
// and keep the page's main thread free. disc-scene.js falls back to calling them
// directly when workers aren't available.

// Case lid: normal, shade and thickness maps from the blurred height map `src`
// (S × SH, red channel = height). `k` = pixels per reference px.
export function shellPixels(src, S, SH, k) {
  const N = S * SH * 4;
  const n = new Uint8ClampedArray(N), s = new Uint8ClampedArray(N), t = new Uint8ClampedArray(N);
  const h = (x, y) => src[(Math.min(SH - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))) * 4] / 255;
  const STR = 4.5;
  for (let y = 0; y < SH; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * STR, dy = (h(x, y + 1) - h(x, y - 1)) * STR;
    const len = Math.hypot(dx, dy, 1), i = ((SH - 1 - y) * S + x) * 4;
    n[i] = (-dx / len * 0.5 + 0.5) * 255;
    n[i + 1] = (dy / len * 0.5 + 0.5) * 255;   // canvas y runs down, texture v runs up
    n[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    n[i + 3] = 255;
    const edge = Math.min(1, Math.hypot(dx, dy) * 0.7);
    const v = 255 - edge * 80 - (h(x, y) < 0.4 ? 14 : 0);
    s[i] = s[i + 1] = s[i + 2] = v; s[i + 3] = 255;
    // thickness: the rim and raised mouldings are thicker plastic, so their colour runs deeper
    const dEdge = Math.min(x, S - x, y, SH - y) / k;
    const th = Math.max(0, Math.min(1, 0.32 + 0.55 * Math.exp(-dEdge / 34) + (h(x, y) - 0.5) * 1.1 + edge * 0.12));
    t[i] = t[i + 1] = t[i + 2] = th * 255; t[i + 3] = 255;
  }
  return { n, s, t };
}

// fine frosted grain for the lid's roughness
export function grainPixels(size) {
  const g = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < g.length; i += 4) {
    const v = 205 + Math.random() * 50;
    g[i] = g[i + 1] = g[i + 2] = v; g[i + 3] = 255;
  }
  return { g };
}

// per-pixel groove direction, tangential to the centre, so highlights fan out radially
export function groovePixels(size) {
  const g = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = 0.5 - y / size;
    const a = Math.atan2(v, u);
    const k = ((size - 1 - y) * size + x) * 4;
    g[k] = (-Math.sin(a) * 0.5 + 0.5) * 255;
    g[k + 1] = (Math.cos(a) * 0.5 + 0.5) * 255;
    g[k + 2] = 255; g[k + 3] = 255;
  }
  return { g };
}

// the disc: fine concentric grooves (normal) and broad track bands (colour)
export function discPixels(size) {
  const half = size / 2, N = size * size * 4;
  const n = new Uint8ClampedArray(N), c = new Uint8ClampedArray(N);
  const GROOVES = 170;                                       // grooves from centre to edge
  const ringNoise = new Float32Array(GROOVES + 2).map(() => 0.55 + Math.random() * 0.45);
  const BANDS = [[0.43, 0.012, 0.18], [0.6, 0.006, 0.1], [0.78, 0.008, 0.12], [0.93, 0.01, 0.1]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x - half) / half, v = (half - y) / half, r = Math.hypot(u, v), k = ((size - 1 - y) * size + x) * 4;
    const ri = Math.min(GROOVES, Math.floor(r * GROOVES));
    const slope = Math.cos(r * GROOVES * Math.PI * 2) * 0.32 * ringNoise[ri];
    const ca = r ? u / r : 0, sa = r ? v / r : 0, len = Math.hypot(slope, 1);
    n[k] = (-slope * ca / len * 0.5 + 0.5) * 255;
    n[k + 1] = (-slope * sa / len * 0.5 + 0.5) * 255;
    n[k + 2] = (1 / len * 0.5 + 0.5) * 255; n[k + 3] = 255;
    // colour: broad track bands, slightly darker toward the clamp area
    let col = 1;
    for (const [rb, w, d] of BANDS) col -= d * Math.exp(-(((r - rb) / w) ** 2));
    col -= 0.06 * (r < 0.48 ? 1 : 0);
    c[k] = c[k + 1] = c[k + 2] = Math.max(0, Math.min(255, col * 255)); c[k + 3] = 255;
  }
  return { n, c };
}
