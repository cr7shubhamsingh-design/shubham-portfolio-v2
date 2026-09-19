# shubham portfolio — agent handoff

Personal portfolio site. **Vite + vanilla HTML/CSS/JS. No framework.** One runtime
dependency (`embla-carousel`); everything else is hand-written.

Codex reads this file automatically. It also works as a plain handoff doc.

- **Local**: `C:\Users\cr7sh\Desktop\My\Claude\shubham-portfolio-v2`
- **Repo**: `github.com/cr7shubhamsingh-design/shubham-portfolio-v2` (branch `master`)
- **Hosting**: Vercel project `shubham-portfolio-v2` → **shubhamdesign.com**
- **Design source**: Figma file `7tPsWNsMuOFEfMpRPX9Spz` ("Portfolio")

---

## ⚠️ Read this first: the repo does not match production

**20 files are uncommitted and nothing has been pushed.** Every deploy has gone out
via the Vercel CLI straight from the working directory, so:

> **production is AHEAD of GitHub.** `git log` does not describe what is live.

`origin/master` is at `9ddc143`, which predates: the case-study detail pages, Embla,
the theme rework, the image trail, the miniplayer, and the Keystatic removal. Do **not**
"restore from git" or assume uncommitted work is unfinished — it is all live and verified.

Untracked/modified includes `case-study.html`, `vite.config.js`, `vercel.json`,
`src/{theme,nav,case-study,case-studies}.js`, `src/trail-images/`, `public/audio/`,
`public/cover-*.jpg`.

**First task for whoever picks this up:** commit and push, so the repo stops lying.

---

## Commands

```bash
npm run dev                  # Vite dev server (port 5174)
npm run build                # → dist/
npx vercel --yes             # preview deploy
npx vercel --prod --yes      # production (shubhamdesign.com)
```

**Deploy convention used throughout:** preview by default; `--prod` **only** when the
user explicitly asks. Nothing is pushed to GitHub unless asked.

---

## Layout

```
index.html            homepage
case-study.html       shared template for all case-study detail pages
vite.config.js        2 entries + dev middleware mirroring the Vercel rewrite
vercel.json           /work/:slug → /case-study.html
src/
  main.js             homepage: loader, hero word cycle, carousel, player, image trail
  case-study.js       detail page: slug resolve, render, back behaviour
  case-studies.js     SINGLE source of truth — carousel + detail pages both read it
  theme.js            shared light/dark (both pages)
  nav.js              wordmark → scroll to top (both pages)
  style.css           all styling, one file
  trail-images/       drop images here → they become the cursor trail
public/               static assets served as-is
```

---

## Routing

`/work/:slug` → `case-study.html`, resolved client-side from the path (falls back to
`?slug=` so the raw `.html` works in dev).

The rewrite exists **twice** and both must stay in sync:
- `vercel.json` — production
- `workRewrite` plugin in `vite.config.js` — dev server

Miss the dev one and `/work/thrust` 404s locally while working in production.

Unknown slugs currently fall back to the first case study rather than 404ing.

---

## Subsystems, and the decisions behind them

Most of these were arrived at by discarding something that looked reasonable. The
reasons matter more than the code.

### Theme switching — instant DOM swap + View Transition crossfade
`--theme-duration: 0ms`. Colours, icon `src`es and the attribute all change in **one
synchronous pass**; a View Transition crossfades a snapshot of the page over the top.
Measured 0ms spread across every element.

- **Do not reintroduce per-element colour easing.** The original had 550ms colour
  transitions plus a 220ms icon fade-swap-fade on a `setTimeout` — two timelines, so
  icons visibly trailed, and elements whose rules lacked a transition snapped early.
- **A blanket `* { transition }` rule was tried and rejected.** It interpolated
  asymptotically — the hero headline was still a third of the way to its new colour
  300ms in — and `!important` clobbered every unrelated transition mid-switch.
- `.theme-instant` (added for the flip) kills live transitions, because a couple of
  hover rules carry their own hardcoded timing and would settle a beat late.
- `.has-view-transitions` is set by JS, not `@supports`, so CSS and the API can't disagree.
- Firefox has no View Transitions → instant, still synchronised, just no crossfade.

### Carousel — Embla, loop off
`loop: false, align: 'center', containScroll: false`. `containScroll: false` is what
lets the first and last cards centre instead of sitting flush against the edge.

**Each slide is wrapped in a real `<a>`.** A JS click handler using
`embla.clickAllowed()` was tried first and silently didn't navigate — Embla's drag guard
swallowed the click. Native anchors get keyboard access and cmd-click for free, and
Embla cancels them correctly after a drag.

### Case-study label swap
`--case-swap-out` (CSS) is **read by JS** so the text swaps exactly at full
transparency. If you retune it, only touch the CSS.

> **Trap:** the CSS minifier serialises `260ms` as `.26s`. Any JS reading a duration
> token must handle both units. This has already caused one false test failure.

### Intro loader — once per session
`sessionStorage['intro-seen']`, checked in the `<head>` script **before first paint**
(adds `.intro-seen` to `<html>`). Returning from a case study must never flash the loader.

### Back navigation
Same-origin referrer → `history.back()` (restores exact scroll position). Otherwise the
`/#work` href takes over, with `behavior: 'auto'` so it lands on the carousel rather
than visibly scrolling past the hero.

### Image trail (bio section)
Port of the ReactBits "Image Trail" (variant 1). The original is React + **GSAP**; the
trail class itself is plain DOM, so only the tween was replaced — **Web Animations API**,
no new dependency (GSAP would have cost ~70kB more than the effect).

- **Gutters only.** It measures the content column and doesn't spawn over it, widened by
  half a card so an edge spawn can't reach the text. An earlier attempt hid images
  *behind* opaque backgrounds — rejected, hard clipping looked wrong.
- **Sources attach on `pointerenter`**, not page load. ~1.6MB of images that most
  visitors never trigger. Nodes are created empty; assigning `background-image` at init
  is what caused the eager fetch.
- Desktop only: `(hover: hover) and (pointer: fine)` + not `prefers-reduced-motion`.
  On touch every scroll is a pointer move and the section sprays artwork.
- Images come **only** from `src/trail-images/` (eager glob, filename order). Empty
  folder = effect disabled. There is no upload UI.

### Miniplayer
**30-second excerpts only, deliberately.** Full commercial tracks self-hosted on a public
domain is straightforward infringement. Clips cut with ffmpeg; artwork pulled clean from
Apple's catalog (the source FLAC's embedded art carried a release-group watermark).
Spotify's `preview_url` is dead for apps created after 2024-11-27, hence the manual cuts.

Player icons are exact Figma vector paths — **filled, not stroked** — and the previous
glyph is `#a6a6a6`, not ink. It matches Figma across 50 measured checks.

### Keystatic — removed
A CMS was trialled and torn out (config, admin route, dev middleware, React,
`content/`). Case-study images now live in `src/case-studies.js`. Don't be surprised by
references in old commits.

---

## Content that is placeholder, not real

- **All four case-study `overview` and `tags`** read "Add the overview…" / "Add timeline"
  / "Add role". Deliberately not invented — writing fake narratives about real client
  work would be fabrication.
- **Thrust's `images`** are three copies of the homepage card image, left from testing
  the CMS. Camb / Hobbes / Sutton have none, so their detail pages are all placeholder frames.
- **Carousel cards** for Camb / Hobbes / Sutton are gradient placeholders, not real work.
- `card-thrust.jpg` is **640×480 rendered at 640px** — soft on retina, wants a 2x export.
- `#resume` and `#playground` in the footer are **dead links** — no matching elements.

---

## Verification

There is **no test suite**. Everything was verified by driving a real headless Chrome
with Playwright (`channel: 'chrome'`, installed outside the project) and asserting
computed styles, geometry and network behaviour against the Figma spec.

> **The in-app browser preview pane does not composite frames when not displayed.**
> `IntersectionObserver` never fires, `requestAnimationFrame` never runs, screenshots
> time out. Anything scroll-, animation- or visibility-driven **cannot** be verified
> there — use Playwright.

Other measurement traps already hit:
- Vite dev requests each eager-glob image as a **module** (`?import`) returning just a
  URL string. Filter those out or lazy-loading looks broken when it isn't.
- Element screenshots race short transitions — freeze the state or sample on rAF.
- Playwright passes `--autoplay-policy=no-user-gesture-required` by default, so autoplay
  blocking must be simulated explicitly.

---

## Environment / infra notes

Carried over from an earlier session; still true.

- **Figma access** is via the **Figma Desktop Bridge** plugin (Figma Desktop → Plugins →
  Development → Figma Desktop Bridge → Run), because the standard Figma MCP has
  view-only access to this file. It disconnects often — rerun the plugin. If it still
  won't connect, a stale process may be holding the port.
- **Vercel Deployment Protection** was disabled project-wide (`ssoProtection: null`) so
  preview and production links are publicly viewable without login.
- **GoDaddy "Domain Forwarding"** is separate from DNS A records and will silently
  override them with a parked page. If the domain ever serves something unexpected,
  check forwarding in GoDaddy's dashboard, not just the DNS records.
- Windows host: native Windows tooling does not understand `/c/Users/...` — use
  `C:\Users\...`. The shell here is Git Bash (POSIX) alongside PowerShell; each needs
  its own syntax.

---

## Known-open items

- **Push to GitHub** (see the warning at the top).
- Whether Vercel auto-deploys on push is **unconfirmed** — all deploys have been CLI.
- Real case-study copy, images, and non-placeholder cards.
- `#resume` / `#playground` destinations.
- Nav pill renders **54px** tall where Figma says 48px — pre-existing. The case-study
  back button stretches to match it rather than hard-coding 48.
- Carousel no longer wraps (loop removed on request) and has no arrows or dots, so the
  last card is a dead end with no affordance.
