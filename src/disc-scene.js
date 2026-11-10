// 3D disc player for the About section: a translucent coloured polycarbonate
// case (traced off the NetEase / MiniDisc references) holding a disc printed
// with the album art. Built from the prototype in /disc-player.html, which keeps
// the settings panel; the values below are the ones chosen there.
//
// createDiscScene(stage) mounts a WebGL canvas in `stage` and returns
//   setTrack({ cover })  – new album: colours fade to the cover's main colour, art swaps
//   setPlaying(bool)     – disc spins up / slows down
//   setProgress(0..1)    – thin arc on the black ring
//   setBackground(css)   – page colour behind the case (follows the site theme)
// Only the scene lives here; song choice, audio and controls stay in main.js.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const SETTINGS = {
  style: 'Printed disc',
  material: 'Coloured plastic',
  translucency: 1,
  frost: 0.65,
  thickness: 1.4,
  ior: 1.58,
  gloss: 1,
  metal: 0,
  plasticColour: 0.8,
  tint: 1,
  quality: 'High',
  exposure: 1.34,
  reflections: 1.17,
  shadow: true,
  shadowOpacity: 0,
  shadowSoftness: 36,
  shadowSize: 1,
  shadowOffset: 0.45,
  glow: 1.6,
  discSat: 1.15,
  discLight: 0.72,
  caseSat: 0.5,
  discRough: 0.3,
  discShine: 1.3,
  reflection: 0.25,
  reflectionLength: 1.1,
};

export function createDiscScene(stage, { background = '#f5f5f5' } = {}) {
const params = { ...SETTINGS };
let lastTone = { h: 220, s: 0, dark: 0, pale: 0, ph: 0, ps: 0 };
const BG = background;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let toneSnapped = false;
let running = false, raf = 0, visible = false, dirty = 2, dtSmooth = 1 / 60, lastTick = 0, vsync = 16.7, skipTick = false;   // render on demand (see frame / wake)

// ------------------------------------------------------------------
// Renderer, camera, environment
// ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// sharp on retina, and still lightly supersampled on 1x screens without the
// 4× pixel cost of a fixed 2 — keeps the frame rate steady
renderer.setPixelRatio(Math.min(2, Math.max(1.25, window.devicePixelRatio || 1)));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
// Studio environment: a bright, soft room with two long softboxes behind the
// viewer. Seen face-on, the disc and plastic reflect *this*, so it sets the look:
// bright silver, with two diagonal light streaks like the reference photos.
const pmrem = new THREE.PMREMGenerator(renderer);
function studioEnv() {
  const env = new RoomEnvironment();
  env.background = new THREE.Color('#a9aeb8');
  const box = (w, h, x, y, z, rz, v) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); m.rotateZ(rz);
    env.add(m);
  };
  box(14, 14, 0, 0, 9, 0, 1.0);               // broad soft fill behind the camera (high-key)
  box(1.6, 16, -4.35, -1.16, 6.5, 0, 6);       // key strip (puts the CD streak at ~11 o'clock)
  box(1.3, 16, 4.35, 1.16, 6.5, 0, 4.5);       // second strip (streak at ~5 o'clock)
  box(10, 2.5, 0, 7, 3, 0, 2.2);               // top bounce, for the lid's top edge
  return pmrem.fromScene(env, 0.02).texture;
}
scene.environment = studioEnv();
scene.environmentIntensity = 1.0;

// Framing: the stage (the case's box on the page) shows STAGE_H world units.
// The canvas overhangs the stage (see CSS), so widen the view to match and aim
// at the canvas centre rather than the stage centre.
// Figma 374:431: the stage is 400 × 377 and the case spans ~392 of its 400px, so
// the stage shows 10.1 × 9.46 world units with the case's top edge at its top.
const CAM_D = 40, STAGE_H = 9.46, CAN = { top: 0.06, h: 1.36 };   // must match .disc-stage canvas in style.css
const STAGE_CY = 9.35 / 2 + 0.03 - STAGE_H / 2;                // world y of the stage centre (case height 9.35, defined further down)
const camera = new THREE.PerspectiveCamera(17, 1, 1, 200);
function frameCamera() {
  const worldH = STAGE_H * CAN.h;
  camera.fov = 2 * Math.atan(worldH / 2 / CAM_D) * 180 / Math.PI;
  const shift = (CAN.h / 2 - CAN.top - 0.5) * STAGE_H;   // canvas centre below stage centre
  camera.position.set(0, STAGE_CY - 0.85 - shift, CAM_D);        // a touch below, for the slight top-down tilt
  camera.lookAt(0, STAGE_CY - shift, 0);
  camera.updateProjectionMatrix();
}

// a soft key light from the top left for the sharp gloss on the lid
const key = new THREE.DirectionalLight(0xffffff, 1.4);
// On the grooved CD this light sets where the bright streaks fall. From ~230°
// (lower left) they land at ~11 and ~5 o'clock, as in the reference
// (checked in headless Chrome across 0–300°).
key.position.set(-6.4, -7.7, 10);
scene.add(key);

// ------------------------------------------------------------------
// Dimensions (1 unit = 100 px of the 990 × 935 reference)
// ------------------------------------------------------------------
const W = 9.9, H = 9.35;
const DISC = new THREE.Vector2(0.37, -0.005);  // disc centre, case-local (measured)
const DISC_R = 4.1;
const toWorld = (sx, sy) => [sx / 100 - W / 2, H / 2 - sy / 100];

function roundRect(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundRectPath(w, h, r, cx, cy) {
  const p = new THREE.Path();
  const x = cx - w / 2, y = cy - h / 2;
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x, y, x, y + r); p.lineTo(x, y + h - r);
  p.quadraticCurveTo(x, y + h, x + r, y + h); p.lineTo(x + w - r, y + h);
  p.quadraticCurveTo(x + w, y + h, x + w, y + h - r); p.lineTo(x + w, y + r);
  p.quadraticCurveTo(x + w, y, x + w - r, y); p.lineTo(x + r, y);
  return p;
}

// ------------------------------------------------------------------
// Materials: polycarbonate (PC), IOR ~1.58
// ------------------------------------------------------------------
const pcGloss = new THREE.MeshPhysicalMaterial({     // clear window + ribs: glass-like
  color: 0xffffff, transmission: 1, thickness: 0.25, roughness: 0.04, ior: 1.58,
  clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1,
  attenuationColor: new THREE.Color('#ffffff'), attenuationDistance: 2.5,
});
const pcFrame = new THREE.MeshPhysicalMaterial({     // lid frame: translucent body, glossy skin
  color: 0xffffff, transmission: 0.8, thickness: 0.5, roughness: 0.22, ior: 1.58,
  clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1,
  attenuationColor: new THREE.Color('#ffffff'), attenuationDistance: 1.6,
});
const pcTray = new THREE.MeshPhysicalMaterial({      // base tray under the disc
  color: 0xffffff, transmission: 0.75, thickness: 0.3, roughness: 0.25, ior: 1.58,
  clearcoat: 0.6, clearcoatRoughness: 0.1,
  attenuationColor: new THREE.Color('#ffffff'), attenuationDistance: 1.6,
});
// the window is a thin flat pane straight over the disc: keep its reflection light
// so the black hub and silver underneath stay true
const pcWindow = pcGloss.clone();
pcWindow.clearcoat = 0.4;
pcWindow.envMapIntensity = 0.3;
pcWindow.specularIntensity = 0.5;
const PC = [pcGloss, pcFrame, pcTray, pcWindow];

// ------------------------------------------------------------------
// Backdrop: page-coloured wall, contact shadow, coloured light under the case
// ------------------------------------------------------------------
function radialTexture(stops, w = 256, h = 256, rect = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (rect) {
    g.filter = 'blur(18px)';
    g.fillStyle = stops;
    g.beginPath(); g.roundRect(40, 40, w - 80, h - 80, 16); g.fill();
  } else {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
  new THREE.MeshBasicMaterial({ color: BG, toneMapped: false }));
wall.position.z = -1.2;
scene.add(wall);

// Contact shadow. The case footprint fills the middle half of a 512px texture,
// leaving a 128px margin so even the softest blur fades to nothing before the
// texture edge (the old 40px margin is what made the shadow look cut off).
const SH_TEX = 512, SH_PAD = 128;
function shadowTexture(softness) {
  const c = document.createElement('canvas'); c.width = c.height = SH_TEX;
  const g = c.getContext('2d');
  g.filter = `blur(${Math.min(softness, 48)}px)`;
  g.fillStyle = 'rgb(40,48,66)';
  g.beginPath(); g.roundRect(SH_PAD, SH_PAD, SH_TEX - SH_PAD * 2, SH_TEX - SH_PAD * 2, 24); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const shadowMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
shadow.position.z = -1.15;
scene.add(shadow);
let shadowSoftnessBuilt = -1;
function applyShadow() {
  if (params.shadowSoftness !== shadowSoftnessBuilt) {
    if (shadowMat.map) shadowMat.map.dispose();
    shadowMat.map = shadowTexture(params.shadowSoftness);
    shadowMat.needsUpdate = true;
    shadowSoftnessBuilt = params.shadowSoftness;
  }
  shadow.visible = params.shadow;
  shadowMat.opacity = params.shadowOpacity;
  const f = SH_TEX / (SH_TEX - SH_PAD * 2);          // texture is 2× the footprint
  shadow.scale.set(W * 0.97 * params.shadowSize * f, H * 0.97 * params.shadowSize * f, 1);
  shadow.position.y = -params.shadowOffset;
  contact.visible = params.shadow;
  contactMat.opacity = Math.min(1, params.shadowOpacity * 0.9);
}

const glowMat = new THREE.MeshBasicMaterial({
  map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]),
  transparent: true, depthWrite: false, toneMapped: false, opacity: 0, color: new THREE.Color('#ffffff'),
});
const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.95, 3.2), glowMat);
glow.position.set(0.3, -H / 2 - 0.55, -1.1);
scene.add(glow);

// tight contact shadow right along the bottom edge (the case "sits" on the page)
const contactMat = new THREE.MeshBasicMaterial({
  map: radialTexture([[0, 'rgba(30,36,52,1)'], [0.5, 'rgba(30,36,52,0.45)'], [1, 'rgba(30,36,52,0)']]),
  transparent: true, depthWrite: false, toneMapped: false,
});
const contact = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.05, 0.9), contactMat);
contact.position.set(0, -H / 2 - 0.12, -1.12);
scene.add(contact);

// soft light band under the case: light that went through the plastic and
// landed on the surface, like the pale slab under the case in the reference
function bandTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.filter = 'blur(10px)';
  const gr = g.createLinearGradient(0, 20, 0, 108);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(28, 20, 200, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const underMat = new THREE.MeshBasicMaterial({ map: bandTexture(), transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color('#ffffff') });
const under = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.25, 1.6), underMat);
under.position.set(0, -H / 2 - 0.55, -1.08);
scene.add(under);

// soft halo of the disc's colour all round the case, like light bleeding out
// through the plastic's edges onto the page
function haloTexture() {
  const S = 512, P = 140, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.filter = 'blur(46px)';
  g.fillStyle = '#fff';
  g.beginPath(); g.roundRect(P, P, S - P * 2, S - P * 2, 40); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0, color: new THREE.Color('#ffffff') });
const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, H * 1.9), haloMat);
halo.position.set(0.2, -0.15, -1.14);
scene.add(halo);

// ------------------------------------------------------------------
// The case
//   z layout: tray (opaque, frosted) → inner walls → disc → lid (translucent PC)
//   → raised mouldings on the lid → label tab.
//   Three.js transmission only "sees" opaque things, so the tray and inner walls
//   are opaque: they are what glows, softly blurred, through the frosted lid.
// ------------------------------------------------------------------
const caseGroup = new THREE.Group();
scene.add(caseGroup);

// The disc as a light source: the wall ring right round the disc and the floor
// under the frame glow evenly in its colour (emissive), and the frosted lid
// spreads that glow out. Point lights were tried and showed up as beads.
const ringGlowMat = new THREE.MeshStandardMaterial({ color: '#dde1e7', roughness: 0.6, emissive: new THREE.Color('#000000') });

const LID_Z = 0.2, LID_D = 0.18, LID_BEVEL = 0.1;
const LID_TOP = LID_Z + LID_D + LID_BEVEL;           // 0.43
const HOLE_R = 4.06;                                  // window; the disc (4.1) tucks under its lip

// The case's colour in the reference isn't in the plastic: it's the disc's light
// glowing through the frost, strongest just around the disc's edge. This
// emissive map paints that glow onto the tray floor (ExtrudeGeometry UVs are
// in world units, hence the repeat/offset).
function discGlowMap() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const cx = (DISC.x / W + 0.5) * S, cy = (0.5 - DISC.y / H) * S, k = S / W;
  const gr = g.createRadialGradient(cx, cy, (DISC_R - 0.4) * k, cx, cy, (DISC_R + 2.6) * k);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.repeat.set(1 / W, 1 / H); t.offset.set(0.5, 0.5);
  return t;
}
const TRAY_BASE = new THREE.Color('#f1f2f5');
const trayMat = new THREE.MeshPhysicalMaterial({
  color: TRAY_BASE.clone(), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.3,
  sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.6,
  emissive: new THREE.Color('#000000'), emissiveMap: discGlowMap(), emissiveIntensity: 1,
});
const wallMat = new THREE.MeshStandardMaterial({ color: '#c3c9d2', roughness: 0.55 });

const extrude = (shape, depth, bevel, segs = 4, curve = 32) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curve });
const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); caseGroup.add(m); return m; };
const rectRing = (w, h, r, t, cx = 0, cy = 0) => {
  const s = roundRect(w, h, r, cx, cy);
  s.holes.push(roundRectPath(w - t * 2, h - t * 2, Math.max(0.02, r - t), cx, cy));
  return s;
};
const circleRing = (r1, r2, cx, cy) => {
  const s = new THREE.Shape(); s.absarc(cx, cy, r2, 0, Math.PI * 2, false);
  const h = new THREE.Path(); h.absarc(cx, cy, r1, 0, Math.PI * 2, true);
  s.holes.push(h); return s;
};
// a round moulded boss with a filleted top edge (lathe profile, axis → +z)
function bossGeo(r, h) {
  const f = Math.min(h * 0.6, r * 0.35), pts = [new THREE.Vector2(0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r, h - f)];
  for (let k = 1; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r - f + Math.cos(a) * f, h - f + Math.sin(a) * f)); }
  pts.push(new THREE.Vector2(0, h));
  const g = new THREE.LatheGeometry(pts, 56);
  g.rotateX(Math.PI / 2);
  return g;
}

// tray: the opaque, frosted floor of the case
add(extrude(roundRect(W - 0.06, H - 0.06, 0.18), 0.1, 0.03), trayMat, 0, 0, -0.26);

// inner walls under the lid (seen blurred through the frost), following the shell's layout
// ------------------------------------------------------------------
// Shell layout, traced off the gold reference (image px → svg px on the
// 990 × 935 case: sx = (x − 65) · 1.636, sy = (y − 73) · 1.649).
// ------------------------------------------------------------------
const SHELL = {
  screws:  [[95, 38], [897, 36], [95, 900], [897, 897]],          // × slot screws with a collar
  bigBoss: [95, 120, 38],                                         // top-left dome
  pill:    [163, 50, 18, 28],                                     // top-left oval (cx, cy, rx, ry)
  lobes:   [[897, 120], [897, 818]],                              // ring bosses with a lobe to the right
  rings:   [[82, 734], [943, 734]],                               // small rings, left and right edges
};
add(extrude(rectRing(W - 0.16, H - 0.16, 0.16, 0.12), 0.3, 0.015, 2), wallMat, 0, 0, -0.15);
add(extrude(circleRing(DISC_R + 0.14, DISC_R + 0.24, DISC.x, DISC.y), 0.18, 0.012, 2, 128), ringGlowMat, 0, 0, -0.15);
for (const [sx, sy] of SHELL.screws) {   // posts only under the screws
  const [x, y] = toWorld(sx, sy); add(bossGeo(0.26, 0.3), wallMat, x, y, -0.16);
}
{ const [cx, cy] = toWorld(101, 157); add(extrude(rectRing(0.98, 1.47, 0.08, 0.05, cx, cy), 0.26, 0.01, 2), wallMat, 0, 0, -0.15); }

// ------------------------------------------------------------------
// Moulded relief: the shell's details are shallow shapes moulded into the
// plastic (soft grey outlines with gentle shading in the reference), so they
// are a height map → normal map on the lid. The same map darkens each
// shape's edge a little (colour map) and drives the satin coat's normals.
// ------------------------------------------------------------------
function shellMaps() {
  const S = 2048, SH = Math.round(S * H / W), k = S / 990;
  const hc = document.createElement('canvas'); hc.width = S; hc.height = SH;
  const g = hc.getContext('2d');
  const BASE = 'rgb(128,128,128)', UP = 'rgb(196,196,196)', HI = 'rgb(232,232,232)', DOWN = 'rgb(70,70,70)';
  g.fillStyle = BASE; g.fillRect(0, 0, S, SH);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const P = v => v * k;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(P(x), P(y), P(w), P(h), P(r)); };
  const circle = (x, y, r) => { g.beginPath(); g.arc(P(x), P(y), P(r), 0, Math.PI * 2); };
  const line = (pts, w = 3, col = DOWN) => {
    g.strokeStyle = col; g.lineWidth = P(w); g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(P(x), P(y)) : g.moveTo(P(x), P(y)))); g.stroke();
  };
  const groove = (w = 3) => { g.strokeStyle = DOWN; g.lineWidth = P(w); g.stroke(); };
  const ridge = (w = 4) => { g.strokeStyle = UP; g.lineWidth = P(w); g.stroke(); };
  const raise = (col = UP) => { g.fillStyle = col; g.fill(); };
  const DC = [532, 468];                                          // disc / window centre

  // 1. rim: a raised band round the edge, inner edge marked by a groove;
  //    the left edge has a second line (the shutter's slider channel)
  g.save(); g.fillStyle = UP;
  g.beginPath(); g.rect(0, 0, S, SH); g.roundRect(P(16), P(12), P(990 - 32), P(935 - 28), P(10)); g.fill('evenodd');
  g.restore();
  rr(16, 12, 958, 907, 10); groove(3);
  line([[18, 30], [18, 905]], 3); line([[36, 210], [36, 905]], 2.5);

  // 2. window: raised lip ring with a groove on its outer edge, plus a second
  //    concentric line round the lower half
  circle(...DC, 424); g.strokeStyle = HI; g.lineWidth = P(26); g.stroke();
  circle(...DC, 439); groove(3);
  g.beginPath(); g.arc(P(DC[0]), P(DC[1]), P(458), Math.PI * 0.08, Math.PI * 0.92); groove(2.5);

  // 3. top-left: panel outline, big dome, oval pill with its outline, screw collar
  rr(52, 84, 98, 147, 8); groove(2.5);
  circle(SHELL.bigBoss[0], SHELL.bigBoss[1], SHELL.bigBoss[2] + 6); groove(3);
  circle(...SHELL.bigBoss); raise('rgb(150,150,150)');
  { const [x, y, rx, ry] = SHELL.pill;
    g.beginPath(); g.ellipse(P(x), P(y), P(rx + 6), P(ry + 7), 0, 0, Math.PI * 2); groove(3);
    g.beginPath(); g.ellipse(P(x), P(y), P(rx), P(ry), 0, 0, Math.PI * 2); raise('rgb(150,150,150)');
    line([[x - rx - 6, y + ry + 6], [x - rx - 6, 231]], 2.5); }

  // 4. top: U-shaped pocket hanging from the top rim, and a short step to its right
  g.beginPath(); g.moveTo(P(674), P(12)); g.lineTo(P(674), P(47));
  g.quadraticCurveTo(P(674), P(59), P(686), P(59)); g.lineTo(P(762), P(59));
  g.quadraticCurveTo(P(774), P(59), P(774), P(47)); g.lineTo(P(774), P(12)); groove(3);
  line([[790, 12], [790, 22], [850, 22]], 2.5);

  // 5. right: ring bosses with a rounded lobe running to the right edge
  for (const [x, y] of SHELL.lobes) {
    g.beginPath(); g.arc(P(x), P(y), P(31), Math.PI * 0.32, Math.PI * 1.68);
    g.lineTo(P(962), P(y - 18)); g.arcTo(P(974), P(y - 18), P(974), P(y), P(14));
    g.arcTo(P(974), P(y + 18), P(962), P(y + 18), P(14)); g.closePath();
    raise('rgb(142,142,142)'); groove(3);
    circle(x, y, 22); raise('rgb(152,152,152)'); groove(2);
  }
  rr(926, 163, 48, 76, 6); groove(2.5);                           // narrow panel under the top-right boss

  // 6. small rings on the left and right edges
  for (const [x, y] of SHELL.rings) { circle(x, y, 17); groove(2.5); circle(x, y, 9); ridge(3); }

  // 7. bottom-left: panel following the window, rim lines along the bottom
  g.beginPath(); g.moveTo(P(48), P(645)); g.lineTo(P(100), P(645));
  g.arc(P(DC[0]), P(DC[1]), P(458), Math.PI * 0.79, Math.PI * 0.66, true);
  g.lineTo(P(48), P(857)); g.closePath(); groove(2.5);
  line([[40, 857], [150, 857]], 2.5); line([[144, 872], [376, 872]], 2.5);

  // 8. bottom-right: two-step staircase running into the screw collar
  line([[756, 909], [756, 893], [800, 893], [800, 876], [870, 876]], 3);
  line([[762, 914], [762, 899], [806, 899], [806, 882], [870, 882]], 2.5, UP);
  rr(926, 690, 48, 76, 6); groove(2.5);                           // panel above the lower-right boss

  // 9. screw collars: raised ring, sunk seat
  for (const [x, y] of SHELL.screws) { circle(x, y, 27); raise('rgb(145,145,145)'); groove(2.5); circle(x, y, 18); raise('rgb(100,100,100)'); }

  // soften so it reads as moulding, not a stamp
  const bc = document.createElement('canvas'); bc.width = S; bc.height = SH;
  const bg = bc.getContext('2d'); bg.filter = `blur(${P(1.8)}px)`; bg.drawImage(hc, 0, 0);
  const src = bg.getImageData(0, 0, S, SH).data;
  const h = (x, y) => src[(Math.min(SH - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))) * 4] / 255;

  const nc = document.createElement('canvas'); nc.width = S; nc.height = SH;
  const sc = document.createElement('canvas'); sc.width = S; sc.height = SH;
  const tc = document.createElement('canvas'); tc.width = S; tc.height = SH;
  const nImg = nc.getContext('2d').createImageData(S, SH), sImg = sc.getContext('2d').createImageData(S, SH);
  const tImg = tc.getContext('2d').createImageData(S, SH);
  const STR = 4.5;
  for (let y = 0; y < SH; y++) for (let x = 0; x < S; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * STR, dy = (h(x, y + 1) - h(x, y - 1)) * STR;
    const len = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    nImg.data[i] = (-dx / len * 0.5 + 0.5) * 255;
    nImg.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;   // canvas y runs down, texture v runs up
    nImg.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    nImg.data[i + 3] = 255;
    const edge = Math.min(1, Math.hypot(dx, dy) * 0.7);
    const v = 255 - edge * 80 - (h(x, y) < 0.4 ? 14 : 0);
    sImg.data[i] = sImg.data[i + 1] = sImg.data[i + 2] = v; sImg.data[i + 3] = 255;
    // thickness: the rim and raised mouldings are thicker plastic, so their colour runs deeper
    const dEdge = Math.min(x, S - x, y, SH - y) / k;
    const t = Math.max(0, Math.min(1, 0.32 + 0.55 * Math.exp(-dEdge / 34) + (h(x, y) - 0.5) * 1.1 + edge * 0.12));
    tImg.data[i] = tImg.data[i + 1] = tImg.data[i + 2] = t * 255; tImg.data[i + 3] = 255;
  }
  tc.getContext('2d').putImageData(tImg, 0, 0);
  nc.getContext('2d').putImageData(nImg, 0, 0);
  sc.getContext('2d').putImageData(sImg, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.repeat.set(1 / W, 1 / H); t.offset.set(0.5, 0.5);   // ExtrudeGeometry UVs are world units
    t.anisotropy = 8;
    return t;
  };
  // fine frosted grain for the roughness
  const gc = document.createElement('canvas'); gc.width = 512; gc.height = 512;
  const gx = gc.getContext('2d'), gImg = gx.createImageData(512, 512);
  for (let i = 0; i < gImg.data.length; i += 4) {
    const v = 205 + Math.random() * 50;
    gImg.data[i] = gImg.data[i + 1] = gImg.data[i + 2] = v; gImg.data[i + 3] = 255;
  }
  gx.putImageData(gImg, 0, 0);
  const grain = new THREE.CanvasTexture(gc);
  grain.colorSpace = THREE.NoColorSpace;
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(1.6 / W, 1.6 / H);
  return { normal: tex(nc, false), shade: tex(sc, true), thick: tex(tc, false), grain };
}
const shell = shellMaps();
Object.assign(pcFrame, {
  normalMap: shell.normal, normalScale: new THREE.Vector2(0.7, 0.7),
  clearcoatNormalMap: shell.normal, clearcoatNormalScale: new THREE.Vector2(0.9, 0.9),
  map: shell.shade, roughnessMap: shell.grain, thicknessMap: shell.thick,
});

// lid frame: thick, bevelled, with the round window cut out
const lidShape = roundRect(W, H, 0.2);
const hole = new THREE.Path(); hole.absarc(DISC.x, DISC.y, HOLE_R, 0, Math.PI * 2, true);
lidShape.holes.push(hole);
add(extrude(lidShape, LID_D, LID_BEVEL, 6, 128), pcFrame, 0, 0, LID_Z);

// clear window over the disc: a thin glass-like pane. It's alpha-blended rather
// than "transmissive" so the (translucent) disc underneath still shows through it
const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0,
  clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2, depthWrite: false,
});
const windowPane = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R + 0.04, HOLE_R + 0.04, 0.05, 160), glassMat);
windowPane.rotation.x = Math.PI / 2;
windowPane.position.set(DISC.x, DISC.y, LID_Z + LID_D * 0.6);
caseGroup.add(windowPane);

// frosted plastic, used for the thin clear lip on the end of the black tab
// (the frosted panel that used to run down over the disc under the tab is gone)
const frostPanelMat = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', transparent: true, opacity: 0.38, roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.15, depthWrite: false,
});

// ------------------------------------------------------------------
// Raised mouldings as real geometry (bevelled, in the case's own plastic), so
// they catch light, colour and refraction like moulded parts
// ------------------------------------------------------------------
const RZ = LID_TOP - 0.015;
const moulded = geo => add(geo, pcFrame, 0, 0, RZ);
const polyTube = (pts, r) => {
  const path = new THREE.CurvePath();
  const v = pts.map(([sx, sy]) => new THREE.Vector3(...toWorld(sx, sy), RZ + r * 0.6));
  for (let k = 0; k < v.length - 1; k++) path.add(new THREE.LineCurve3(v[k], v[k + 1]));
  caseGroup.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24 * (v.length - 1), r, 12, false), pcFrame));
};
moulded(extrude(circleRing(HOLE_R, HOLE_R + 0.22, DISC.x, DISC.y), 0.025, 0.03, 4, 192));          // lip round the window
moulded(extrude(rectRing(9.58, 9.07, 0.12, 0.08, 0, 0.02), 0.012, 0.02, 3));                        // raised inner border
{ const [x, y] = toWorld(SHELL.bigBoss[0], SHELL.bigBoss[1]); add(bossGeo(0.38, 0.06), pcFrame, x, y, RZ); }  // big dome
{ const [cx, cy] = toWorld(SHELL.pill[0], SHELL.pill[1]);                                                   // oval pill
  const s = new THREE.Shape(); s.absellipse(cx, cy, SHELL.pill[2] / 100, SHELL.pill[3] / 100, 0, Math.PI * 2);
  moulded(extrude(s, 0.02, 0.03, 4, 48)); }
for (const [sx, sy] of SHELL.lobes) {                                                                      // ring bosses with a lobe
  const [x, y] = toWorld(sx, sy), [ex] = toWorld(974, sy);
  add(bossGeo(0.31, 0.045), pcFrame, x, y, RZ);
  moulded(extrude(roundRect(ex - x, 0.36, 0.18, (x + ex) / 2, y), 0.015, 0.03, 4));
  add(bossGeo(0.21, 0.075), pcFrame, x, y, RZ);
}
for (const [sx, sy] of SHELL.rings) {                                                                      // small rings on the edges
  const [x, y] = toWorld(sx, sy);
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 12, 40), pcFrame); t.position.set(x, y, RZ + 0.02); caseGroup.add(t);
}
for (const [sx, sy, sw, sh] of [[52, 84, 98, 147], [926, 163, 48, 76], [926, 690, 48, 76]]) {             // panel rims
  const [cx, cy] = toWorld(sx + sw / 2, sy + sh / 2);
  moulded(extrude(rectRing(sw / 100, sh / 100, 0.07, 0.035, cx, cy), 0.01, 0.015, 3));
}
polyTube([[674, 14], [674, 47], [686, 59], [762, 59], [774, 47], [774, 14]], 0.025);                    // U-pocket at the top
polyTube([[756, 909], [756, 893], [800, 893], [800, 876], [870, 876]], 0.03);                          // staircase, bottom right

// screws: real domed metal heads with a cut × slot, in a moulded collar
const screwMat = new THREE.MeshPhysicalMaterial({ color: '#c2c0c7', metalness: 1, roughness: 0.32, anisotropy: 0.5 });
const slotMat = new THREE.MeshStandardMaterial({ color: '#3d3b42', roughness: 0.7 });
for (const [sx, sy] of SHELL.screws) {
  const [x, y] = toWorld(sx, sy);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 40), pcFrame);
  collar.position.set(x, y, RZ + 0.025); caseGroup.add(collar);
  add(bossGeo(0.15, 0.05), screwMat, x, y, RZ);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.032, 0.04), slotMat);
    slot.position.set(x, y, RZ + 0.05); slot.rotation.z = a; caseGroup.add(slot);
  }
}

// ------------------------------------------------------------------
// The disc: translucent coloured plastic, as in the reference. Fine concentric
// grooves (normal map) catch a soft sheen; a few broader "track" bands and a
// faint print make it read as a real disc (and show it turning).
// ------------------------------------------------------------------
function grooveMap(size = 512) {
  // per-pixel groove direction, tangential to the centre, so highlights fan out radially
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = 0.5 - y / size;
    const a = Math.atan2(v, u);
    const k = (y * size + x) * 4;
    img.data[k] = (-Math.sin(a) * 0.5 + 0.5) * 255;
    img.data[k + 1] = (Math.cos(a) * 0.5 + 0.5) * 255;
    img.data[k + 2] = 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}
function discMaps(size = 1024) {
  const half = size / 2;
  const nc = document.createElement('canvas'); nc.width = nc.height = size;
  const cc = document.createElement('canvas'); cc.width = cc.height = size;
  const nImg = nc.getContext('2d').createImageData(size, size), cImg = cc.getContext('2d').createImageData(size, size);
  const GROOVES = 170;                                       // grooves from centre to edge
  const ringNoise = new Float32Array(GROOVES + 2).map(() => 0.55 + Math.random() * 0.45);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x - half) / half, v = (half - y) / half, r = Math.hypot(u, v), k = (y * size + x) * 4;
    const ri = Math.min(GROOVES, Math.floor(r * GROOVES));
    const slope = Math.cos(r * GROOVES * Math.PI * 2) * 0.32 * ringNoise[ri];
    const ca = r ? u / r : 0, sa = r ? v / r : 0, len = Math.hypot(slope, 1);
    nImg.data[k] = (-slope * ca / len * 0.5 + 0.5) * 255;
    nImg.data[k + 1] = (-slope * sa / len * 0.5 + 0.5) * 255;
    nImg.data[k + 2] = (1 / len * 0.5 + 0.5) * 255; nImg.data[k + 3] = 255;
    // colour: broad track bands, slightly darker toward the clamp area
    let c = 1;
    for (const [rb, w, d] of [[0.43, 0.012, 0.18], [0.6, 0.006, 0.1], [0.78, 0.008, 0.12], [0.93, 0.01, 0.1]]) c -= d * Math.exp(-(((r - rb) / w) ** 2));
    c -= 0.06 * (r < 0.48 ? 1 : 0);
    const v8 = Math.max(0, Math.min(255, c * 255));
    cImg.data[k] = cImg.data[k + 1] = cImg.data[k + 2] = v8; cImg.data[k + 3] = 255;
  }
  nc.getContext('2d').putImageData(nImg, 0, 0);
  const cg = cc.getContext('2d'); cg.putImageData(cImg, 0, 0);
  const n = new THREE.CanvasTexture(nc); n.colorSpace = THREE.NoColorSpace; n.anisotropy = 8;
  const c = new THREE.CanvasTexture(cc); c.colorSpace = THREE.SRGBColorSpace; c.anisotropy = 8;
  return { normal: n, color: c };
}
const dmaps = discMaps();
const discMat = new THREE.MeshPhysicalMaterial({
  color: '#c9ccd2', map: dmaps.color,
  transmission: 0.35, thickness: 0.25, ior: 1.58, roughness: 0.22,
  attenuationColor: new THREE.Color('#9aa0aa'), attenuationDistance: 0.35,
  normalMap: dmaps.normal, normalScale: new THREE.Vector2(0.7, 0.7),
  anisotropy: 0.55, anisotropyMap: grooveMap(),
  clearcoat: 0.9, clearcoatRoughness: 0.1, clearcoatNormalMap: dmaps.normal, clearcoatNormalScale: new THREE.Vector2(0.25, 0.25),
  specularIntensity: 1, specularColor: new THREE.Color('#ffffff'), sheen: 0.5, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'),
});
const discBase = new THREE.Group();                  // spins while playing
discBase.position.set(DISC.x, DISC.y, 0.06);
caseGroup.add(discBase);
const discGroup = discBase;
const discGeo = new THREE.CylinderGeometry(DISC_R, DISC_R, 0.05, 192, 1);
discGeo.rotateX(Math.PI / 2);
// The top of the disc is a printed label carrying the album art (as on the
// printed disc in the reference): art over the whole surface, a clear ring
// left round the hub and a thin clear rim at the edge. Redrawn per track.
const ART = 1024, PRINT_IN = 1.8 / DISC_R, PRINT_OUT = 0.975;
const artCanvas = document.createElement('canvas'); artCanvas.width = artCanvas.height = ART;
const artTex = new THREE.CanvasTexture(artCanvas); artTex.colorSpace = THREE.SRGBColorSpace; artTex.anisotropy = 8;
artTex.center.set(0.5, 0.5); artTex.rotation = Math.PI / 2;   // cylinder caps map UVs a quarter-turn off; this puts the art upright
function drawDiscArt(img) {
  const g = artCanvas.getContext('2d'), c = ART / 2;
  // clear plastic areas: pale grey, or smoky for dark covers
  g.fillStyle = (lastTone.dark > 0.5) ? '#3c3e44' : '#e4e8ec'; g.fillRect(0, 0, ART, ART);
  if (img) {
    g.save();
    g.beginPath(); g.arc(c, c, c * PRINT_OUT, 0, Math.PI * 2); g.arc(c, c, c * PRINT_IN, 0, Math.PI * 2, true); g.clip('evenodd');
    g.drawImage(img, 0, 0, ART, ART);                               // square art, cropped to the disc
    // faint print edge rings, like a printed label's border
    g.restore();
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
  for (const r of [PRINT_IN, PRINT_OUT]) { g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.stroke(); }
  artTex.needsUpdate = true;
}
drawDiscArt(null);
const printMat = new THREE.MeshPhysicalMaterial({
  map: artTex, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18,
  emissive: '#ffffff', emissiveIntensity: 0,                        // used to fade the print to blank between tracks
});
// Reflective MiniDisc surface (the 'Reflective disc' style), after the MD photo:
// mirror data area with rainbow at the light streaks, a black printed ring with
// text round the hub, a clear inner ring and a clear rim, tinted by the album,
// under a glassy clear coat. Maps are drawn once; the tint is the material colour.
function cdMaps() {
  const S = 1024, c = S / 2;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = S; return cv; };
  const col = mk(), mr = mk(), irid = mk(), thick = mk();
  const R = { data0: 1.8 / DISC_R, rim: 0.975 };
  // colour: white mirror (tinted by material colour), black print ring, pale clear areas
  let g = col.getContext('2d');
  g.fillStyle = '#e8ecef'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c, c, c * R.rim, 0, 7); g.fill();
  g.fillStyle = '#e8ecef'; g.beginPath(); g.arc(c, c, c * R.data0, 0, 7); g.fill();   // clear band (no print)
  // metal (B) / roughness (G): data area is polished metal, print ring is satin ink, clear areas glossy
  g = mr.getContext('2d');
  g.fillStyle = 'rgb(0,26,0)'; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgb(0,24,255)'; g.beginPath(); g.arc(c, c, c * R.rim, 0, 7); g.fill();
  g.fillStyle = 'rgb(0,26,0)'; g.beginPath(); g.arc(c, c, c * R.data0, 0, 7); g.fill();
  // rainbow only on the mirror, in the sectors beside the light streaks
  const sector = a => { for (const s0 of [200, 20]) { const d = ((a - s0 + 540) % 360) - 180; if (Math.abs(d) < 32) return d / 32; } return null; };
  for (const [cv, fn] of [[irid, (a, r) => (r > R.data0 && r < R.rim) ? (sector(a) === null ? 0.08 : 0.08 + 0.92 * Math.cos(sector(a) * Math.PI / 2) ** 1.5) : 0],
                          [thick, (a, r) => sector(a) === null ? 0.5 : sector(a) * 0.5 + 0.5]]) {
    const gg = cv.getContext('2d'), img = gg.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const a = (Math.atan2(y - c, x - c) * 180 / Math.PI + 360) % 360, r = Math.hypot(x - c, y - c) / c, k = (y * S + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = fn(a, r) * 255; img.data[k + 3] = 255;
    }
    gg.putImageData(img, 0, 0);
  }
  const tex = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
    t.center.set(0.5, 0.5); t.rotation = Math.PI / 2;      // same quarter-turn as the printed art
    return t;
  };
  return { color: tex(col, true), mr: tex(mr, false), irid: tex(irid, false), thick: tex(thick, false) };
}
const cdm = cdMaps();
const cdMat = new THREE.MeshPhysicalMaterial({
  color: '#e4e6ea', map: cdm.color,
  metalness: 1, metalnessMap: cdm.mr, roughness: 1, roughnessMap: cdm.mr,
  anisotropy: 0.8, anisotropyMap: grooveMap(),
  iridescence: 1, iridescenceMap: cdm.irid, iridescenceIOR: 1.8,
  iridescenceThicknessMap: cdm.thick, iridescenceThicknessRange: [200, 850],
  clearcoat: 1, clearcoatRoughness: 0.015, envMapIntensity: 1.6,    // the glassy top layer
  specularIntensity: 1,
});
const cdTint = new THREE.Color('#e4e6ea');

// cylinder groups: 0 = side, 1 = top (faces the viewer after the rotation), 2 = bottom
const disc = new THREE.Mesh(discGeo, [discMat, printMat, discMat]);
disc.position.z = 0.025;
discBase.add(disc);

// Centre, as in the reference: a pale clear band, a wide glossy black ring with
// an inner step, and a frosted blue-grey clear hub with a raised lip and a dark hole.
const clampMat = new THREE.MeshPhysicalMaterial({ color: '#dfe5ea', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.75 });   // pale clear band
const clamp = new THREE.Mesh(extrude(circleRing(1.55, 1.8, 0, 0), 0.02, 0.01, 3, 128), clampMat);
clamp.position.z = 0.05;
discBase.add(clamp);
const blackMat = new THREE.MeshPhysicalMaterial({ color: '#0a0b0c', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 0.35 });   // deep black plastic, soft sheen
const ringOuter = new THREE.Mesh(extrude(circleRing(1.18, 1.55, 0, 0), 0.04, 0.018, 4, 160), blackMat);
ringOuter.position.z = 0.05; discBase.add(ringOuter);
const ringInner = new THREE.Mesh(extrude(circleRing(0.95, 1.2, 0, 0), 0.06, 0.016, 4, 160), blackMat);   // the inner step
ringInner.position.z = 0.05; discBase.add(ringInner);
const hubMat = new THREE.MeshPhysicalMaterial({ color: '#c7d3da', roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') });   // frosted clear hub
{
  // lathe profile: flat centre, a raised lip near the edge, falling to the black ring
  const P = [[0.17, 0.085], [0.7, 0.085], [0.76, 0.11], [0.88, 0.11], [0.95, 0.07], [0.95, 0]].map(([r, z]) => new THREE.Vector2(r, z));
  const g = new THREE.LatheGeometry(P, 128); g.rotateX(Math.PI / 2);
  hubMat.side = THREE.DoubleSide;
  const hub = new THREE.Mesh(g, hubMat);
  hub.position.z = 0.05; discBase.add(hub);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.8, side: THREE.DoubleSide }));
  hole.rotation.x = Math.PI / 2; hole.position.z = 0.09; discBase.add(hole);
  const holeBase = new THREE.Mesh(new THREE.CircleGeometry(0.17, 48), new THREE.MeshBasicMaterial({ color: '#0b0b0d' }));
  holeBase.position.z = 0.06; discBase.add(holeBase);
}
const hubR = 1.55;

// progress: a thin raised arc on the clamp ring (doesn't spin)
const progMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.25 });
let progMesh = null;
function setProgress(p) {
  if (progMesh) { caseGroup.remove(progMesh); progMesh.geometry.dispose(); }
  if (p <= 0.002) { progMesh = null; return; }
  const arc = p * Math.PI * 2;
  progMesh = new THREE.Mesh(new THREE.TorusGeometry(1.37, 0.018, 8, Math.max(8, Math.round(96 * p)), arc), progMat);
  progMesh.rotation.z = Math.PI / 2 - arc;
  progMesh.position.set(DISC.x, DISC.y, 0.06 + 0.1);
  caseGroup.add(progMesh);
}

// ------------------------------------------------------------------
// Black tab + album label
// ------------------------------------------------------------------
const tab = new THREE.Group();
caseGroup.add(tab);
// tab colour depends on the style (white block with the printed disc, black with the label card)
const tabMat = new THREE.MeshPhysicalMaterial({ color: '#0e0e10', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, specularIntensity: 0.8 });   // hard, glossy, opaque black plastic
{
  // shutter as in the reference: a narrow spine up the left edge joined to a
  // wide body that holds the label (case-local units, traced off the photo)
  const L = -4.97, bodyR = -1.14, bodyT = 1.245, bodyB = -1.325, spineR = -4.59, spineT = 2.515, r = 0.1;
  const s = new THREE.Shape();
  s.moveTo(L, bodyB);
  s.lineTo(bodyR - r, bodyB); s.quadraticCurveTo(bodyR, bodyB, bodyR, bodyB + r);
  s.lineTo(bodyR, bodyT - r); s.quadraticCurveTo(bodyR, bodyT, bodyR - r, bodyT);
  s.lineTo(spineR, bodyT);
  s.lineTo(spineR, spineT - r); s.quadraticCurveTo(spineR, spineT, spineR - r, spineT);
  s.lineTo(L, spineT); s.lineTo(L, bodyB);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3 }), tabMat);
  m.position.z = 0.64;
  tab.add(m);
  // the body ends in a thin clear plastic edge (the shutter's lip in the reference)
  const lip = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundRect(0.16, bodyT - bodyB + 0.04, 0.08, bodyR + 0.04, (bodyT + bodyB) / 2),
      { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }),
    frostPanelMat);
  lip.position.z = 0.645;
  tab.add(lip);
}
function stickerTexture() {
  const c = document.createElement('canvas'); c.width = 240; c.height = 600;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 240, 0);
  gr.addColorStop(0, '#c6c6ca'); gr.addColorStop(0.55, '#efeff1'); gr.addColorStop(1, '#d9d9dd');
  g.fillStyle = gr; g.fillRect(0, 0, 240, 600);
  g.save(); g.translate(120, 300); g.rotate(Math.PI / 2);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#8a8a90'; g.font = '500 58px Inter, sans-serif'; g.fillText('shubham.', 0, -44);
  g.fillStyle = '#333337'; g.font = '600 62px Inter, sans-serif'; g.fillText('On rotation', 0, 40);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// sticker and label are thin rounded cards with real edges, not flat planes
const sticker = new THREE.Mesh(new RoundedBoxGeometry(0.56, 1.42, 0.03, 3, 0.05),
  new THREE.MeshPhysicalMaterial({ map: stickerTexture(), roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
sticker.position.set(-4.6, -0.04, 0.765);
tab.add(sticker);

const cardFrame = new THREE.Mesh(new RoundedBoxGeometry(2.2, 2.2, 0.05, 3, 0.09),
  new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
cardFrame.position.set(-2.4, -0.05, 0.765);
tab.add(cardFrame);
const coverMat = new THREE.MeshPhysicalMaterial({ color: '#dddddd', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0 });
const coverMesh = new THREE.Mesh(new RoundedBoxGeometry(2.2, 2.2, 0.03, 3, 0.16), coverMat);   // art sits straight on the black, rounded corners
coverMesh.position.set(-2.42, -0.04, 0.76);
tab.add(coverMesh);

// ------------------------------------------------------------------
// Reflection: the case stands on a glossy surface, so a flipped copy of it
// shows below the bottom edge and fades out (as in the reference). The copy
// shares geometry and materials, so colours and the album art stay in sync.
// ------------------------------------------------------------------
const MIRROR_GAP = 0.04;
// ------------------------------------------------------------------
// Vertical gradient on the case plastic (vertex colours, multiplied into the
// material colour). Every cover: slightly darker toward the bottom. Dark
// covers: darker at the top, lifting toward the bottom with a hint of the
// album's colour. The reflection shares these geometries, so it follows.
// ------------------------------------------------------------------
const gradMeshes = [];
caseGroup.updateMatrixWorld(true);
caseGroup.traverse(o => {
  if (!o.isMesh || o.material !== pcFrame) return;
  const pos = o.geometry.attributes.position, v = new THREE.Vector3();
  const t = new Float32Array(pos.count);
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
    t[k] = Math.min(1, Math.max(0, (H / 2 - v.y) / H));          // 0 at the top edge, 1 at the bottom
  }
  o.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
  gradMeshes.push({ attr: o.geometry.attributes.color, t });
});
pcFrame.vertexColors = true;
// The vertex colour scales the final shaded colour (reflections included), not just
// the base colour: on the dark cases most of what you see is reflection.
pcFrame.onBeforeCompile = sh => {
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <color_fragment>', '')
    .replace('#include <opaque_fragment>', 'outgoingLight *= vColor.rgb;\n#include <opaque_fragment>');
};
pcFrame.customProgramCacheKey = () => 'pc-gradient';
pcFrame.needsUpdate = true;
const gradTop = new THREE.Color(), gradBottom = new THREE.Color(), gradAccent = new THREE.Color();
let gradKey = '';
function applyGradient(dark, hue, sat) {
  // light/coloured: even at the top, slightly darker at the bottom;
  // dark: darker at the top, lifting to a lighter, album-tinted bottom
  gradTop.setScalar(1).lerp(new THREE.Color(0.55, 0.55, 0.58), dark);
  gradAccent.setHSL(hue, Math.min(0.8, sat * 1.4 + 0.15), 0.6);
  gradBottom.setScalar(0.66).lerp(new THREE.Color(1, 1, 1).lerp(gradAccent, Math.min(0.7, sat * 1.4 + 0.2)).multiplyScalar(1.45), dark);
  const key = [gradTop, gradBottom].map(c => c.toArray().map(x => x.toFixed(3)).join()).join();
  if (key === gradKey) return;                                    // unchanged: skip the upload
  gradKey = key;
  for (const { attr, t } of gradMeshes) {
    const a = attr.array;
    for (let k = 0; k < t.length; k++) {
      const f = t[k];
      a[k * 3] = gradTop.r + (gradBottom.r - gradTop.r) * f;
      a[k * 3 + 1] = gradTop.g + (gradBottom.g - gradTop.g) * f;
      a[k * 3 + 2] = gradTop.b + (gradBottom.b - gradTop.b) * f;
    }
    attr.needsUpdate = true;
  }
}
applyGradient(0, 0, 0);

const mirror = caseGroup.clone();
mirror.scale.y = -1;
mirror.position.y = -H - MIRROR_GAP;
scene.add(mirror);
// find the copy of the spinning disc by walking the same path
function pathTo(root, target) {
  const p = []; let o = target;
  while (o && o !== root) { p.unshift(o.parent.children.indexOf(o)); o = o.parent; }
  return p;
}
const follow = (root, p) => p.reduce((o, k) => o.children[k], root);
const mirrorDisc = follow(mirror, pathTo(caseGroup, discBase));
const mirrorCard = [follow(mirror, pathTo(caseGroup, cardFrame)), follow(mirror, pathTo(caseGroup, coverMesh))];

// Two looks, switchable in the panel:
//  'Printed disc'    – album art printed on the disc
//  'Reflective disc' – a mirror MiniDisc, tinted by the album, under a glassy coat
// Both keep the black hard-plastic strip with the album-art card.
const STYLES = ['Printed disc', 'Reflective disc'];
function applyStyle() {
  if (!STYLES.includes(params.style)) params.style = STYLES[0];     // older saved value
  const printed = params.style === 'Printed disc';
  disc.material[1] = printed ? printMat : cdMat;        // the array is shared with the reflection's copy
  for (const o of [coverMesh, mirrorCard[1]]) o.visible = true;
  for (const o of [cardFrame, mirrorCard[0]]) o.visible = false;   // no white frame round the art
}

// page-coloured veil over the reflection: see-through at the top, solid lower down
function fadeTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.08, 'rgba(255,255,255,0.35)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  gr.addColorStop(0.5, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Two page-coloured layers sit in front of the reflection (never over the real case):
//  - a gradient veil, clear at the bottom edge and solid lower down → Length
//  - a flat veil over the whole reflection; its opacity → Strength
const MIRROR_TOP = -H / 2 - MIRROR_GAP / 2;
const veilMat = new THREE.MeshBasicMaterial({ map: fadeTexture(), color: BG, transparent: true, depthWrite: false, toneMapped: false });
const veil = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, 1), veilMat);
veil.renderOrder = 10;
scene.add(veil);
const veilFlatMat = new THREE.MeshBasicMaterial({ color: BG, transparent: true, depthWrite: false, toneMapped: false });
const veilFlat = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, H + 2), veilFlatMat);
veilFlat.position.set(0, MIRROR_TOP - (H + 2) / 2, 1.45);
veilFlat.renderOrder = 9;
scene.add(veilFlat);
// solid page colour below the gradient, so nothing of the copy shows further down
const veilBase = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, H + 4), new THREE.MeshBasicMaterial({ color: BG, toneMapped: false }));
scene.add(veilBase);
function applyReflection() {
  const on = params.reflection > 0;
  mirror.visible = veil.visible = veilFlat.visible = veilBase.visible = on;
  const len = Math.max(0.3, params.reflectionLength);         // world units until fully faded
  veil.scale.y = len * 2;                                     // texture is solid from its middle down
  veil.position.set(0, MIRROR_TOP - len, 1.5);
  veilBase.position.set(0, MIRROR_TOP - len * 2 - (H + 4) / 2 + 0.01, 1.5);
  veilFlatMat.opacity = 1 - params.reflection;
  under.visible = !on;                                        // the old glow band, only without a reflection
}

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');

// ------------------------------------------------------------------
// Sizing + render loop (no hover tilt: the case sits still)
// ------------------------------------------------------------------
function resize() {
  const c = renderer.domElement;
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  frameCamera();
}
const ro = new ResizeObserver(resize); ro.observe(stage);
resize();

// colour state (lerped)
const shadeA = new THREE.Color();
const tone = { dark: 0, darkTarget: 0, pale: 0, paleTarget: 0,
  paleCase: new THREE.Color('#ffffff'), paleCaseT: new THREE.Color('#ffffff'), paleDeep: new THREE.Color('#ffffff'), paleDeepT: new THREE.Color('#ffffff'), cur: new THREE.Color('#dcdde2'), target: new THREE.Color('#dcdde2'),
  tint: new THREE.Color('#ffffff'), tintTarget: new THREE.Color('#ffffff'), s: 0, sTarget: 0 };
const COVER_FADE_MS = 220;
const coverFade = { v: 0, target: 0 };
let coverSwap = 0, fadeStarted = 0;
let spinSpeed = 0, playing = false;
const clock = new THREE.Clock();
const caseColor = new THREE.Color('#ffffff');
const glowColor = new THREE.Color('#ffffff');
const DARK = {                                   // the look for dark / black album covers
  // smoked, still see-through plastic: light enough that the inside, the frost,
  // the bevels and the gloss all stay readable (never an opaque black slab)
  plastic: new THREE.Color('#c4c6cc'), smoke: new THREE.Color('#6c6f76'), floor: new THREE.Color('#72757c'),
  wall: new THREE.Color('#8e9198'), clamp: new THREE.Color('#9a9da4'), disc: new THREE.Color('#4a4d54'),
  mirror: new THREE.Color('#7a7d85'),
};
const WALL_BASE = new THREE.Color('#c3c9d2'), CLAMP_BASE = new THREE.Color('#dfe5ea');
const attenColor = new THREE.Color('#ffffff');
const WHITE = new THREE.Color('#ffffff');
const hsl = { h: 0, s: 0, l: 0 };
// Very bright hues (neon green, yellow, cyan) glare at the same saturation that
// looks fine for blue or red. glare(h) is how bright the pure hue looks (0–1);
// tame() pulls saturation and lightness down for the bright ones.
const _g = new THREE.Color();
const glare = h => { _g.setHSL(h, 1, 0.5); return 0.2126 * _g.r + 0.7152 * _g.g + 0.0722 * _g.b; };
function tame(c) {
  c.getHSL(_hsl);
  const over = Math.max(0, glare(_hsl.h) - 0.3) / 0.6;            // 0 for blue/red/purple, ~1 for neon green
  if (over <= 0) return c;
  return c.setHSL(_hsl.h, _hsl.s * (1 - 0.6 * over), _hsl.l * (1 - 0.3 * over));
}
const _hsl = { h: 0, s: 0, l: 0 };

// ------------------------------------------------------------------
// Apply settings
// ------------------------------------------------------------------
function applyMaterial() {
  const p = params, metal = p.metal ? 1 : 0;
  // lid frame: the main body of the case
  Object.assign(pcFrame, {
    metalness: metal, transmission: metal ? 0 : p.translucency, roughness: p.frost,
    thickness: p.thickness, ior: p.ior, clearcoat: p.gloss, clearcoatRoughness: 0.14,   // satin, not mirror
    attenuationDistance: 0.3 + (1 - p.plasticColour) * 3,
  });
  // tray underneath: same stuff, a little more diffuse
  Object.assign(pcTray, {
    metalness: metal, transmission: metal ? 0 : p.translucency * 0.94, roughness: Math.min(1, p.frost + 0.05),
    thickness: p.thickness * 0.6, ior: p.ior, clearcoat: p.gloss * 0.6,
    attenuationDistance: 0.4 + p.thickness * 2.4,
  });
  // moulded ribs: polished, so always glossier than the body
  Object.assign(pcGloss, {
    metalness: metal, transmission: metal ? 0 : Math.min(1, p.translucency + 0.2), roughness: Math.min(0.06, p.frost * 0.25),
    ior: p.ior, clearcoat: p.gloss,
  });
  // window over the disc stays see-through in every material
  Object.assign(pcWindow, { ior: p.ior, roughness: Math.min(0.05, p.frost * 0.2) });
  for (const m of PC) m.needsUpdate = true;
  discMat.roughness = p.discRough;
  discMat.envMapIntensity = p.discShine;
}
function applyRender() {
  renderer.toneMappingExposure = params.exposure;
  scene.environmentIntensity = params.reflections;
  resize();
}
applyMaterial();
applyRender();
applyShadow();
applyReflection();
applyStyle();


function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
const tones = new Map();
function toneOf(url) {
  if (tones.has(url)) return tones.get(url);
  const p = new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data;
        // Most prevalent colour by area (not the most saturated accent): count
        // pixels per hue bin, ignoring near-black, near-white and grey pixels;
        // those are tallied separately to decide 'dark' and 'neutral' covers.
        const bins = new Float32Array(24), satB = new Float32Array(24), sx = new Float32Array(24), sy = new Float32Array(24);
        let n = 0, nDark = 0, lSum = 0, rS = 0, gS = 0, bS = 0;
        for (let k = 0; k < d.length; k += 4) {
          const [h, s, l] = rgbToHsl(d[k], d[k + 1], d[k + 2]);
          n++; lSum += l; rS += d[k]; gS += d[k + 1]; bS += d[k + 2];
          if (l < 0.14) { nDark++; continue; }
          if (l > 0.93 || s < 0.16) continue;
          const b = Math.floor(h / 15) % 24;
          bins[b] += 1; satB[b] += s;
          sx[b] += Math.cos(h * Math.PI / 180); sy[b] += Math.sin(h * Math.PI / 180);
        }
        let best = 0, bw = -1;
        for (let b = 0; b < 24; b++) {
          const w = bins[b] + 0.5 * (bins[(b + 23) % 24] + bins[(b + 1) % 24]);
          if (w > bw) { bw = w; best = b; }
        }
        let x = 0, y = 0, cnt = 0, sat = 0;
        for (const b of [(best + 23) % 24, best, (best + 1) % 24]) { x += sx[b]; y += sy[b]; cnt += bins[b]; sat += satB[b]; }
        const hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        const coverage = cnt / n;                     // share of the cover in that colour
        const satAvg = cnt ? sat / cnt : 0;
        const sOut = coverage < 0.1 ? 0 : Math.min(0.8, (0.2 + satAvg * 0.75) * Math.min(1, coverage * 2.5 + 0.3));
        // dark: mostly near-black pixels, or a low overall lightness
        const meanL = lSum / n;
        let dark = Math.max(0, Math.min(1, Math.max((nDark / n - 0.35) / 0.3, (0.3 - meanL) / 0.18)));
        // white / pale, washed-out covers would leave a near-white case on a near-white
        // page, so they default to the dark (smoky) shade as well
        const pale = Math.max(0, Math.min(1, (meanL - 0.4) / 0.12)) * Math.max(0, Math.min(1, (0.32 - sOut) / 0.12));
        const [ph, ps] = rgbToHsl(rS / n, gS / n, bS / n);        // the cover's average colour
        resolve({ h: hue, s: sOut, dark, pale: pale * (1 - dark), ph, ps, coverage });
      } catch (e) { resolve({ h: 220, s: 0, dark: 0 }); }
    };
    img.onerror = () => resolve({ h: 220, s: 0, dark: 0 });
    img.src = url.replace(/\/\d+x\d+bb\./, '/60x60bb.');
  });
  tones.set(url, p);
  return p;
}
function setTone(h, s, extra = {}) {
  lastTone = { ...lastTone, ...extra, h, s };
  tone.darkTarget = lastTone.dark;
  tone.paleTarget = lastTone.pale;
  // pale covers: a deeper shade of their own (average) colour — white → light
  // grey, cream/beige → tan/brown — so the case still reads against the page
  const ps = Math.min(0.42, lastTone.ps * 1.3);
  tone.paleCaseT.setHSL(lastTone.ph / 360, ps, 0.84 - ps * 0.14, THREE.SRGBColorSpace);
  tone.paleDeepT.setHSL(lastTone.ph / 360, Math.min(0.55, ps * 1.3), 0.68 - ps * 0.18, THREE.SRGBColorSpace);
  // disc: tinted metal (silver when the cover has no strong colour)
  tone.target.setHSL(h / 360, Math.min(1, s * params.discSat), params.discLight, THREE.SRGBColorSpace);
  if (!s) tone.target.set('#dcdde2');
  // case: the plastic itself only takes a whisper of the colour
  tone.tintTarget.setHSL(h / 360, s * params.caseSat, 0.975 - s * 0.03, THREE.SRGBColorSpace);
  if (!s) tone.tintTarget.set('#ffffff');
  tone.sTarget = s;
}
function applyTone(url) {
  toneOf(url).then(({ h, s, dark, pale, ph, ps }) => {
    if (tracks[i] && tracks[i].cover !== url) return;
    setTone(h, s, { dark, pale, ph, ps });
  });
}


function frame(now) {
  // ~60fps is plenty for a slow spin: on fast screens (120/144Hz) draw every
  // other vsync, which halves the GPU work and keeps an even cadence
  if (lastTick) vsync += (Math.min(50, now - lastTick) - vsync) * 0.1;
  lastTick = now;
  if (vsync < 10 && (skipTick = !skipTick)) { raf = requestAnimationFrame(frame); return; }
  // frame time, lightly smoothed so one slow frame can't make the disc lurch
  const rawDt = Math.min(0.05, clock.getDelta());
  dtSmooth += (rawDt - dtSmooth) * 0.2;
  const dt = dtSmooth;
  // a slow, lazy spin (~3 rpm) that eases up to speed and back down
  const SPIN = reduceMotion ? 0.12 : 0.32;                     // rad/s
  spinSpeed += ((playing ? SPIN : 0) - spinSpeed) * (1 - Math.exp(-dt * 1.6));
  discBase.rotation.z -= spinSpeed * dt;          // the whole disc turns; the light streaks stay put

  const k = 1 - Math.exp(-dt * 4.5);                              // colour ease: settles in ~1s
  tone.cur.lerp(tone.target, k);
  tone.tint.lerp(tone.tintTarget, k);
  tone.s += (tone.sTarget - tone.s) * k;
  tone.dark += (tone.darkTarget - tone.dark) * k;
  tone.pale += (tone.paleTarget - tone.pale) * k;
  tone.paleCase.lerp(tone.paleCaseT, k); tone.paleDeep.lerp(tone.paleDeepT, k);
  // the disc is deeper, more saturated plastic than the case (as in the reference)
  tone.cur.getHSL(hsl);
  const ds = Math.min(1, tone.s * 2.2);                           // 0 = neutral (smoky clear), 1 = fully coloured
  discMat.color.setHSL(hsl.h, Math.min(0.85, 0.45 + hsl.s) * ds + 0.04, 0.72 - ds * 0.26);
  discMat.attenuationColor.setHSL(hsl.h, 0.9 * ds + 0.04, 0.6 - ds * 0.24);
  // reflective disc: a light metallic tint of the album colour (silver when neutral)
  cdTint.setHSL(hsl.h, Math.min(0.75, hsl.s * 0.9) * ds, 0.86 - ds * 0.12);
  cdMat.color.copy(cdTint).lerp(DARK.mirror, tone.dark);          // dark cover → gunmetal mirror
  // case colour = album tint (scaled by the Tint control); metal gets a touch darker base
  caseColor.setRGB(1, 1, 1).lerp(tone.tint, Math.min(1.5, params.tint));
  tame(caseColor);
  if (params.metal) caseColor.multiplyScalar(0.92);
  // the colour light picks up passing through the plastic: a deep, saturated
  // version of the album colour (white = clear for silver discs)
  tone.cur.getHSL(hsl);
  attenColor.setHSL(hsl.h, Math.min(0.95, 0.35 + tone.s * 0.9), 0.5);
  tame(attenColor);
  attenColor.lerp(WHITE, 1 - Math.min(1, tone.s * 2.2) * Math.min(1, params.plasticColour + 0.0001) * (params.metal ? 0 : 1));
  // dark / black covers: smoked plastic, dark floor and walls
  caseColor.lerp(tone.paleCase, tone.pale).lerp(DARK.plastic, tone.dark);
  attenColor.lerp(tone.paleDeep, tone.pale).lerp(DARK.smoke, tone.dark);
  for (const m of PC) { m.color.copy(caseColor); m.attenuationColor.copy(attenColor); }
  tone.cur.getHSL(hsl);
  applyGradient(Math.round(tone.dark * 50) / 50, Math.round(hsl.h * 72) / 72, Math.round(tone.s * 25) / 25);   // quantised: re-uploads only when it visibly changes
  trayMat.color.copy(TRAY_BASE).multiply(caseColor).lerp(DARK.floor, tone.dark);
  shadeA.copy(WALL_BASE).lerp(tone.paleDeep, tone.pale * 0.6);
  wallMat.color.copy(shadeA).lerp(DARK.wall, tone.dark);
  ringGlowMat.color.copy(shadeA).lerp(DARK.wall, tone.dark);
  clampMat.color.copy(CLAMP_BASE).lerp(DARK.clamp, tone.dark);
  frostPanelMat.color.copy(WHITE).lerp(tone.paleCase, tone.pale).lerp(DARK.plastic, tone.dark);
  discMat.color.lerp(DARK.disc, tone.dark);
  discMat.attenuationColor.lerp(DARK.smoke, tone.dark);
  // disc-coloured light under the frost (none for silver discs)
  // light the disc throws, reflected: on the case, in a halo round it, and in the
  // pale band where it lands on the surface below
  const glowAmt = Math.min(1, tone.s * 1.6) * params.glow * (params.metal ? 0.35 : 1);
  tone.cur.getHSL(hsl);
  glowColor.setHSL(hsl.h, Math.min(1, hsl.s * 1.2 + 0.1), 0.66);   // deeper than the pastel disc
  tame(glowColor);
  ringGlowMat.emissive.copy(glowColor).multiplyScalar(glowAmt * 1.1);
  trayMat.emissive.copy(glowColor).multiplyScalar(glowAmt * 0.9);
  haloMat.color.copy(glowColor);
  haloMat.opacity = glowAmt * 0.06;   // barely: the reference has no halo round the case
  underMat.color.copy(caseColor).lerp(glowColor, Math.min(0.9, glowAmt * 0.8));
  underMat.opacity = 0.7 + glowAmt * 0.3;
  glowMat.color.copy(tone.cur);
  glowMat.opacity = (0.15 + tone.s * 0.75 * Math.min(1, params.tint)) * params.glow * (params.metal ? 0.3 : 1);

  // album art cross-fade (linear, COVER_FADE_MS each way)
  const step = dt * 1000 / COVER_FADE_MS;
  coverFade.v = coverFade.target > coverFade.v ? Math.min(coverFade.target, coverFade.v + step) : Math.max(coverFade.target, coverFade.v - step);
  coverMat.opacity = coverFade.v;
  printMat.emissiveIntensity = (1 - coverFade.v) * 0.9;   // print washes out to a blank disc while the art swaps
  mirrorDisc.rotation.z = discBase.rotation.z;

  renderer.render(scene, camera);
  // Render on demand: keep the loop alive only while something is moving —
  // the disc spinning, colours or the art still fading, or a pending redraw
  // (resize, theme, new progress). Once it all settles the loop stops, and the
  // GPU does nothing until wake() is called again.
  // The colour ease is exponential, so its tail is invisible long before it ends:
  // call it settled at a small difference and snap the rest (next frame draws it).
  const near = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.006;
  const toneBusy = Math.abs(tone.s - tone.sTarget) > 0.003 || Math.abs(tone.dark - tone.darkTarget) > 0.003 || Math.abs(tone.pale - tone.paleTarget) > 0.003 ||
    !near(tone.cur, tone.target) || !near(tone.tint, tone.tintTarget) || !near(tone.paleCase, tone.paleCaseT) || !near(tone.paleDeep, tone.paleDeepT);
  if (!toneBusy && !toneSnapped) {
    tone.s = tone.sTarget; tone.dark = tone.darkTarget; tone.pale = tone.paleTarget;
    tone.cur.copy(tone.target); tone.tint.copy(tone.tintTarget); tone.paleCase.copy(tone.paleCaseT); tone.paleDeep.copy(tone.paleDeepT);
    toneSnapped = true; dirty = Math.max(dirty, 1);
  } else if (toneBusy) toneSnapped = false;
  const busy = playing || spinSpeed > 0.002 || coverFade.v !== coverFade.target || toneBusy;
  if (dirty > 0) dirty--;
  if (running && (busy || dirty > 0)) raf = requestAnimationFrame(frame);
  else running = false;
}


// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------
let currentCover = null;
function setTrack({ cover }) {
  if (!cover || cover === currentCover) return;
  currentCover = cover;
  toneOf(cover).then(({ h, s, dark, pale, ph, ps }) => {
    if (cover !== currentCover) return;
    setTone(h, s, { dark, pale, ph, ps });
    wake();
  });
  // the album art fades out, swaps, and fades back in (on the card and the disc)
  const swapId = ++coverSwap;
  coverFade.target = 0;
  texLoader.load(cover, tex => {
    if (swapId !== coverSwap) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const swapIn = () => {
      if (swapId !== coverSwap) { tex.dispose(); return; }
      if (coverMat.map) coverMat.map.dispose();
      coverMat.map = tex; coverMat.color.set('#ffffff'); coverMat.needsUpdate = true;
      drawDiscArt(tex.image);
      coverFade.target = 1;
      wake();
    };
    const wait = coverMat.map ? Math.max(0, COVER_FADE_MS - (performance.now() - fadeStarted)) : 0;
    setTimeout(swapIn, wait);
  });
  fadeStarted = performance.now();
  wake();
}
function setBackground(css) {
  const c = new THREE.Color(css);
  scene.background = c;
  wall.material.color.copy(c);
  veilMat.color.copy(c); veilFlatMat.color.copy(c); veilBase.material.color.copy(c);
  wake();
}
// render only while the player is on screen
function start() { if (!running) { running = true; lastTick = 0; clock.getDelta(); dtSmooth = 1 / 60; raf = requestAnimationFrame(frame); } }
function stop() { running = false; cancelAnimationFrame(raf); }
// ask for a redraw; runs only while the player is (nearly) on screen
function wake() { dirty = Math.max(dirty, 2); if (visible) start(); }
const io = new IntersectionObserver(es => {
  visible = es.some(e => e.isIntersecting);
  if (visible) wake(); else stop();
}, { rootMargin: '200px 0px' });
io.observe(stage);

return {
  setTrack,
  setPlaying(on) { playing = !!on; wake(); },
  setProgress(p) { setProgress(p); wake(); },
  setBackground,
  destroy() { stop(); io.disconnect(); ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); },
};
}
