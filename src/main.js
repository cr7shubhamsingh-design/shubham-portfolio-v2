import EmblaCarousel from 'embla-carousel';
import { initTheme } from './theme.js';
import { initNavHome } from './nav.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { CASE_STUDIES, caseStudyPath } from './case-studies.js';

initSmoothScroll();

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

const markIntroSeen = () => {
  try {
    sessionStorage.setItem('intro-seen', '1');
  } catch (error) {
    // Private mode — the intro will simply play again next navigation.
  }
};

// Land on the section named in the hash. Explicitly 'auto' because the global
// scroll-behavior is smooth, and returning from a case study should arrive at
// the carousel rather than visibly scrolling down past the hero.
const settleHashTarget = () => {
  const { hash } = window.location;
  if (!hash || hash.length < 2) return;
  requestAnimationFrame(() => {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
};

const introSeen = document.documentElement.classList.contains('intro-seen');

if (loadingScreen && loadingImg && mainScreen && !introSeen) {
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
    markIntroSeen();
    settleHashTarget();
  }, LOADING_TOTAL_MS);
} else if (mainScreen) {
  mainScreen.classList.add('is-visible');
  markIntroSeen();
  settleHashTarget();
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

const DESIGNER_CYCLE_INTERVAL_MS = 2000;

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

initTheme((theme) => setDesignerTheme(theme));
initNavHome();

const clockEl = document.getElementById('local-clock');

if (clockEl) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tick = () => {
    clockEl.textContent = `[ ${formatter.format(new Date())} ]`;
  };

  tick();
  setInterval(tick, 1000);
}

// The playlist is Shubham's top 20 on Last.fm over the last 30 days, one song
// per artist, rebuilt on the 15th of each month by
// .github/workflows/top-tracks.yml into data/top-tracks.json. It's read
// straight from the repo at runtime, so the monthly update never needs a site
// deploy. The hand-picked list below is the fallback for when that file can't
// be fetched (or doesn't exist yet). 30s excerpts, not full tracks.
const TOP_TRACKS_URL =
  'https://raw.githubusercontent.com/cr7shubhamsingh-design/shubham-portfolio-v2/master/data/top-tracks.json';

const FALLBACK_TRACKS = [
  {
    title: 'iPod Touch',
    artist: 'Ninajirachi',
    src: '/audio/ipod-touch.m4a',
    cover: '/cover-ipod-touch.webp',
    spotify: 'https://open.spotify.com/track/1xqT27jSG1Y15vOXfsV0gv',
  },
  {
    title: 'Supersonic',
    artist: 'fromis_9',
    src: '/audio/supersonic.m4a',
    cover: '/cover-supersonic.webp',
    spotify: 'https://open.spotify.com/track/6oNLSQX8bcAdbCElZYju3v',
  },
  {
    title: 'Twilight Zone',
    artist: 'Ariana Grande',
    src: '/audio/twilight-zone.m4a',
    cover: '/cover-twilight-zone.webp',
    spotify: 'https://open.spotify.com/track/1UrwJzlNC2oaTlxj1OZmcu',
  },
  {
    title: 'Pool',
    artist: 'Paramore',
    src: '/audio/pool.m4a',
    cover: '/cover-pool.webp',
    spotify: 'https://open.spotify.com/track/3xCsHloPBl211Yi4UEUUcm',
  },
  {
    title: 'Massaging Me',
    artist: 'Future',
    src: '/audio/massaging-me.m4a',
    cover: '/cover-massaging-me.webp',
    spotify: 'https://open.spotify.com/track/5hs2urSRIvZbmcQwvxEtat',
  },
  {
    title: 'In Motion',
    artist: 'beabadoobee',
    src: '/audio/in-motion.m4a',
    cover: '/cover-in-motion.webp',
    spotify: 'https://open.spotify.com/track/0N6xvbX8lsB8u9Q9B6rJgt',
  },
  {
    title: 'the cure',
    artist: 'Olivia Rodrigo',
    src: '/audio/the-cure.m4a',
    cover: '/cover-the-cure.webp',
    spotify: 'https://open.spotify.com/track/4EoJ151oQ5jY48z4RhSE96',
  },
  {
    title: 'Basement Freestyle',
    artist: 'Travis Scott',
    src: '/audio/basement-freestyle.m4a',
    cover: '/cover-basement-freestyle.webp',
    spotify: 'https://open.spotify.com/track/0I3MkBTrKeKulwuSSLEJGN',
  },
  {
    title: 'harvest sky',
    artist: 'Oklou & underscores',
    src: '/audio/harvest-sky.m4a',
    cover: '/cover-harvest-sky.webp',
    spotify: 'https://open.spotify.com/track/0Bz6Ih38mhIR3ZnzB1TYDV',
  },
  {
    title: 'Whiplash',
    artist: 'aespa',
    src: '/audio/whiplash.m4a',
    cover: '/cover-whiplash.webp',
    spotify: 'https://open.spotify.com/track/3coRPMnFg2dJcPu5RMloa9',
  },
  {
    title: 'Cosmic',
    artist: 'Red Velvet',
    src: '/audio/cosmic.m4a',
    cover: '/cover-cosmic.webp',
    spotify: 'https://open.spotify.com/track/0kE4TRJ0pWoRKzKdtbx8To',
  },
  {
    title: "We Don't Leave the House",
    artist: 'glaive',
    src: '/audio/we-dont-leave-the-house.m4a',
    cover: '/cover-we-dont-leave-the-house.webp',
    spotify: 'https://open.spotify.com/track/5Tej0q4FelEClV0ZvYvz89',
  },
  {
    title: 'The Party & The After Party',
    artist: 'The Weeknd',
    src: '/audio/the-party-and-the-after-party.m4a',
    cover: '/cover-the-party-and-the-after-party.webp',
    spotify: 'https://open.spotify.com/track/0dcf0L6F1LUA1nE2zWH4J2',
  },
  {
    title: 'Reborn',
    artist: 'KIDS SEE GHOSTS',
    src: '/audio/reborn.m4a',
    cover: '/cover-reborn.webp',
    spotify: 'https://open.spotify.com/track/4RVbK6cV0VqWdpCDcx3hiT',
  },
];

const playerEl = document.querySelector('.player');
const playBtn = document.getElementById('player-play');

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const isTrack = (t) =>
  t && typeof t.title === 'string' && typeof t.artist === 'string' && /^https:\/\//.test(t.src) && /^https:\/\//.test(t.cover);

if (playerEl && playBtn && FALLBACK_TRACKS.length) {
  let TRACKS = shuffle(FALLBACK_TRACKS);
  const artEl = document.getElementById('player-art');
  const titleEl = document.getElementById('player-title');
  const artistEl = document.getElementById('player-artist');
  const spotifyEl = document.getElementById('player-spotify');
  const elapsedEl = document.getElementById('player-elapsed');
  const durationEl = document.getElementById('player-duration');
  const scrubberEl = document.getElementById('player-scrubber');
  const fillEl = document.getElementById('player-fill');
  const prevBtn = document.getElementById('player-prev');
  const nextBtn = document.getElementById('player-next');

  const audio = new Audio();
  audio.preload = 'metadata';
  // Play at 20% of the visitor's system volume, so hitting play doesn't blast
  // them. Set once on the element; switching tracks only swaps the src, so it
  // holds for every track.
  audio.volume = 0.2;

  let trackIndex = 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '00:00';
    const total = Math.max(0, Math.floor(seconds));
    const mins = String(Math.floor(total / 60)).padStart(2, '0');
    const secs = String(total % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const renderProgress = () => {
    const duration = audio.duration;
    const ratio = Number.isFinite(duration) && duration > 0 ? audio.currentTime / duration : 0;
    fillEl.style.width = `${Math.min(100, ratio * 100)}%`;
    elapsedEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(duration);
    scrubberEl.setAttribute('aria-valuemax', Math.floor(duration || 0));
    scrubberEl.setAttribute('aria-valuenow', Math.floor(audio.currentTime));
  };

  // Apple's artwork server renders any size and format on request, so ask for
  // just the pixels the cover is actually drawn at (60px on desktop, the full
  // card width on phones) as WebP, instead of the 1000px JPEG in the list —
  // roughly 400 KB down to 10–60 KB. Local fallback covers pass through as-is.
  const coverSrc = (url) => {
    if (!/mzstatic\.com\//.test(url)) return url;
    const drawn = (artEl.getBoundingClientRect().width || 60) * (window.devicePixelRatio || 1);
    const px = Math.min(1000, Math.max(100, Math.ceil(drawn / 100) * 100));
    return url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/, `/${px}x${px}bb.webp`);
  };

  // The player sits far down the page, so hold the cover back until it's
  // within about a screen of view. Only the latest requested cover is kept, so
  // when the monthly list replaces the fallback before the visitor gets there,
  // the fallback's cover is never downloaded at all. (loading="lazy" alone
  // wasn't enough: Chrome's lazy-load distance already reaches the player.)
  let pendingCover = null;
  let artInView = !('IntersectionObserver' in window);
  const showCover = (url) => {
    pendingCover = url;
    if (artInView) artEl.src = coverSrc(url);
  };
  if (!artInView) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        artInView = true;
        if (pendingCover) artEl.src = coverSrc(pendingCover);
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(playerEl);
  }

  const loadTrack = (index, autoplay) => {
    trackIndex = (index + TRACKS.length) % TRACKS.length;
    const track = TRACKS[trackIndex];
    audio.src = track.src;
    showCover(track.cover);
    artEl.alt = `${track.title} by ${track.artist}`;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    if (spotifyEl) spotifyEl.href = track.spotify;
    fillEl.style.width = '0%';
    elapsedEl.textContent = '00:00';
    if (autoplay) audio.play().catch(() => {});
  };

  const setPlayingState = (isPlaying) => {
    playerEl.classList.toggle('is-playing', isPlaying);
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  };

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  // With a single track, "previous" restarts it if we're already past the
  // opening seconds — same convention as a physical transport control.
  prevBtn?.addEventListener('click', () => {
    if (TRACKS.length === 1 || audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    loadTrack(trackIndex - 1, !audio.paused);
  });

  nextBtn?.addEventListener('click', () => {
    if (TRACKS.length === 1) {
      audio.currentTime = 0;
      return;
    }
    loadTrack(trackIndex + 1, !audio.paused);
  });

  const seekTo = (clientX) => {
    const rect = scrubberEl.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
      renderProgress();
    }
  };

  scrubberEl.addEventListener('pointerdown', (event) => {
    seekTo(event.clientX);
    const onMove = (moveEvent) => seekTo(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Releasing outside the window can swallow pointerup; without this the bar
    // would keep tracking the cursor after the drag is over.
    window.addEventListener('pointercancel', onUp);
  });

  scrubberEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 5 : -5;
    audio.currentTime = Math.min(audio.duration || 0, Math.max(0, audio.currentTime + step));
    renderProgress();
  });

  audio.addEventListener('play', () => setPlayingState(true));
  audio.addEventListener('pause', () => setPlayingState(false));
  audio.addEventListener('timeupdate', renderProgress);
  audio.addEventListener('loadedmetadata', renderProgress);
  audio.addEventListener('ended', () => {
    if (TRACKS.length > 1) {
      loadTrack(trackIndex + 1, true);
    } else {
      audio.currentTime = 0;
      setPlayingState(false);
    }
  });

  // The monthly list hotlinks Apple's preview files. If one ever disappears,
  // skip to the next song rather than leaving the player stuck on silence —
  // but give up after a full lap so a dead network can't spin forever.
  let failures = 0;
  audio.addEventListener('playing', () => {
    failures = 0;
  });
  audio.addEventListener('error', () => {
    if (!audio.src || TRACKS.length < 2 || ++failures >= TRACKS.length) return;
    loadTrack(trackIndex + 1, true);
  });

  loadTrack(0, false);

  // Swap in the monthly list once it arrives — but only if the visitor hasn't
  // started using the player, so a late response never yanks a song they're
  // listening to. Any failure just leaves the fallback in place.
  let touched = false;
  const markTouched = () => {
    touched = true;
  };
  [playBtn, prevBtn, nextBtn, scrubberEl].forEach((el) => el?.addEventListener('pointerdown', markTouched));
  [playBtn, prevBtn, nextBtn, scrubberEl].forEach((el) => el?.addEventListener('keydown', markTouched));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  fetch(TOP_TRACKS_URL, { signal: controller.signal })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const list = Array.isArray(data?.tracks) ? data.tracks.filter(isTrack) : [];
      if (!list.length || touched || !audio.paused) return;
      TRACKS = shuffle(list);
      loadTrack(0, false);
    })
    .catch(() => {})
    .finally(() => clearTimeout(timeout));
}

const caseViewport = document.getElementById('case-viewport');

if (caseViewport) {
  const caseIcon = document.getElementById('case-icon');
  const caseTitle = document.getElementById('case-title');
  const caseSubtitle = document.getElementById('case-subtitle');
  const caseText = document.querySelector('.case-studies__text');
  const caseLink = document.getElementById('case-link');

  const embla = EmblaCarousel(caseViewport, {
    loop: false,
    align: 'center',
    // Let the first and last cards centre too; the default trims those snaps
    // so the outer cards would sit flush against the viewport edges.
    containScroll: false,
    skipSnaps: false,
    duration: 30,
  });

  // Read the fade-out length from CSS (--case-swap-out) so the label swaps at
  // full transparency. Minified CSS may serialise it as ".26s" rather than "260ms".
  const swapOutMs = () => {
    const raw = getComputedStyle(caseText || caseViewport)
      .getPropertyValue('--case-swap-out')
      .trim();
    const value = parseFloat(raw);
    if (!Number.isFinite(value)) return 260;
    return raw.endsWith('ms') ? value : value * 1000;
  };

  const updateInfo = (index, animate) => {
    const study = CASE_STUDIES[index];
    if (!study) return;
    const apply = () => {
      // A study can be mid-setup with no logo yet — hide the slot rather than
      // requesting a file that isn't there and showing a broken image.
      if (caseIcon) {
        if (study.icon) {
          caseIcon.src = study.icon;
          caseIcon.hidden = false;
        } else {
          caseIcon.removeAttribute('src');
          caseIcon.hidden = true;
        }
      }
      if (caseTitle) caseTitle.textContent = study.title;
      if (caseSubtitle) caseSubtitle.textContent = study.subtitle;
      if (caseLink) {
        caseLink.href = caseStudyPath(study.slug);
        // An external study opens in a new tab so the portfolio isn't lost.
        if (study.externalUrl) {
          caseLink.target = '_blank';
          caseLink.rel = 'noopener';
          caseLink.setAttribute('aria-label', `Visit ${study.title}`);
        } else {
          caseLink.removeAttribute('target');
          caseLink.setAttribute('aria-label', `View ${study.title} case study`);
        }
      }
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
    }, swapOutMs());
  };

  // Parallax tween, following Embla's official parallax example.
  const TWEEN_FACTOR_BASE = 0.2;
  let tweenFactor = 0;
  let tweenNodes = [];

  const setTweenNodes = (emblaApi) => {
    tweenNodes = emblaApi.slideNodes().map((slideNode) =>
      slideNode.querySelector('.embla__parallax__layer'),
    );
  };

  const setTweenFactor = (emblaApi) => {
    tweenFactor = TWEEN_FACTOR_BASE * emblaApi.scrollSnapList().length;
  };

  const tweenParallax = (emblaApi, eventName) => {
    const engine = emblaApi.internalEngine();
    const scrollProgress = emblaApi.scrollProgress();
    const slidesInView = emblaApi.slidesInView();
    const isScrollEvent = eventName === 'scroll';

    emblaApi.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = engine.slideRegistry[snapIndex];

      slidesInSnap.forEach((slideIndex) => {
        if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target();
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress);
              if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress);
            }
          });
        }

        const translate = diffToTarget * (-1 * tweenFactor) * 100;
        const tweenNode = tweenNodes[slideIndex];
        if (tweenNode) tweenNode.style.transform = `translateX(${translate}%)`;
      });
    });
  };

  setTweenNodes(embla);
  setTweenFactor(embla);
  tweenParallax(embla);

  embla
    .on('reInit', setTweenNodes)
    .on('reInit', setTweenFactor)
    .on('reInit', tweenParallax)
    .on('scroll', tweenParallax)
    .on('slideFocus', tweenParallax);

  updateInfo(embla.selectedScrollSnap(), false);
  embla.on('select', () => updateInfo(embla.selectedScrollSnap(), true));

  // Dragging isn't the only way through the deck: a horizontal trackpad swipe
  // (or shift + wheel on a mouse) advances it too. Deliberately only horizontal
  // intent — hijacking the vertical wheel here would trap the page whenever the
  // pointer happened to be over the carousel.
  //
  // One gesture moves exactly one card. After firing, it stays locked until the
  // wheel has actually gone quiet — a fixed cooldown doesn't work, because a
  // trackpad flick keeps delivering events (and its momentum tail) for far
  // longer than any cooldown worth having, and each burst past it would step
  // another card.
  const WHEEL_THRESHOLD = 40;
  const WHEEL_IDLE = 140;

  let wheelAccum = 0;
  let wheelLocked = false;
  let wheelIdleTimer = null;

  // Rearmed on every event, so it only fires once the gesture truly stops.
  const armWheelIdle = () => {
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelLocked = false;
      wheelAccum = 0;
    }, WHEEL_IDLE);
  };

  caseViewport.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return;

      // Shift + wheel is how a mouse scrolls sideways; some browsers report it
      // on deltaY rather than deltaX.
      const horizontal = event.shiftKey
        ? event.deltaY || event.deltaX
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : 0;

      if (!horizontal) return;
      event.preventDefault();

      // Every event pushes the "gesture over" moment further out, so the whole
      // swipe plus its tail counts as one.
      armWheelIdle();
      if (wheelLocked) return;

      wheelAccum += horizontal;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

      if (wheelAccum > 0) embla.scrollNext();
      else embla.scrollPrev();

      wheelAccum = 0;
      wheelLocked = true;
    },
    { passive: false },
  );

  // Navigation is handled by the real <a> wrapping each slide, so keyboard and
  // cmd-click work natively and Embla cancels the click when a drag just ended.
}

// Pointer trail across the bio, ported from the ReactBits "Image Trail"
// effect (variant 1). The original is a React component driving GSAP; the
// trail class itself is plain DOM code, so only the tween needed replacing —
// the Web Animations API expresses the same two-stage timeline natively and
// keeps this dependency-free.
// The trail shows whatever is in src/trail-images/ — drop files in that folder
// and they appear, in filename order. Nothing else is used, so the effect stays
// dark until there is at least one image there. Globbed at build time, so the
// files are hashed and fingerprinted like any other asset.
const TRAIL_IMAGE_MODULES = import.meta.glob(
  './trail-images/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true, import: 'default' },
);

const TRAIL_IMAGES = Object.keys(TRAIL_IMAGE_MODULES)
  .sort()
  .map((path) => TRAIL_IMAGE_MODULES[path]);

const trailEl = document.getElementById('about-trail');
const trailSection = trailEl?.closest('.about');

// Desktop pointers only: on touch, every scroll gesture is a "move" and the
// section would spray artwork while the visitor is just reading.
const wantsTrail =
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (trailEl && trailSection && TRAIL_IMAGES.length && wantsTrail) {
  // Nodes are created empty. Assigning the background here would make the
  // browser fetch every image on page load — well over a megabyte for an
  // effect most visitors never trigger — so the sources are attached the
  // first time the cursor enters the section instead.
  const nodes = TRAIL_IMAGES.map(() => {
    const node = document.createElement('div');
    node.className = 'about__trail-img';
    trailEl.appendChild(node);
    return node;
  });

  let sourcesAttached = false;

  const attachSources = () => {
    if (sourcesAttached) return;
    sourcesAttached = true;
    nodes.forEach((node, index) => {
      node.style.backgroundImage = `url('${TRAIL_IMAGES[index]}')`;
    });
  };

  const THRESHOLD = 80; // px of travel between spawns
  const lerp = (a, b, n) => (1 - n) * a + n * b;

  let mouse = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };
  let cache = { x: 0, y: 0 };
  let imgIndex = 0;
  let zIndexVal = 1;
  let rafId = 0;
  let running = false;
  let imgSize = { w: 180, h: 180 };

  // Horizontal span of the content column (the bio copy and the player share
  // one centred column). Everything outside it is a live gutter.
  let column = null;

  const measure = () => {
    const rect = nodes[0].getBoundingClientRect();
    if (rect.width) imgSize = { w: rect.width, h: rect.height };

    const sectionRect = trailSection.getBoundingClientRect();
    const boxes = [
      trailSection.querySelector('.about__copy'),
      trailSection.querySelector('.player'),
    ]
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect());

    column = boxes.length
      ? {
          left: Math.min(...boxes.map((b) => b.left)) - sectionRect.left,
          right: Math.max(...boxes.map((b) => b.right)) - sectionRect.left,
        }
      : null;
  };

  // The trail only runs in the gutters. The dead band is widened by half a card
  // so one spawned right at the edge still can't reach the text or the player.
  const inGutter = (x) => {
    if (!column) return true;
    const pad = imgSize.w / 2;
    return x < column.left - pad || x > column.right + pad;
  };

  const showNextImage = () => {
    zIndexVal += 1;
    imgIndex = (imgIndex + 1) % nodes.length;
    const node = nodes[imgIndex];
    const fromX = cache.x - imgSize.w / 2;
    const fromY = cache.y - imgSize.h / 2;
    const toX = mouse.x - imgSize.w / 2;
    const toY = mouse.y - imgSize.h / 2;

    node.getAnimations().forEach((animation) => animation.cancel());
    node.style.zIndex = String(zIndexVal);
    const anim = node.animate(
      [
        {
          offset: 0,
          opacity: 1,
          transform: `translate(${fromX}px, ${fromY}px) scale(1)`,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // ≈ gsap power1
        },
        {
          offset: 0.5,
          opacity: 1,
          transform: `translate(${toX}px, ${toY}px) scale(1)`,
          easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', // ≈ gsap power3
        },
        {
          offset: 1,
          opacity: 0,
          transform: `translate(${toX}px, ${toY}px) scale(0.2)`,
        },
      ],
      { duration: 800, fill: 'forwards' },
    );
    // The keyframes end on opacity 0, which is also the resting CSS state, so
    // releasing the finished animation changes nothing visually and stops them
    // accumulating on the element.
    anim.onfinish = () => anim.cancel();
  };

  const render = () => {
    const distance = Math.hypot(mouse.x - last.x, mouse.y - last.y);
    cache.x = lerp(cache.x, mouse.x, 0.1);
    cache.y = lerp(cache.y, mouse.y, 0.1);

    if (distance > THRESHOLD) {
      if (inGutter(mouse.x)) showNextImage();
      // Reset the travel either way. Skipping this while crossing the column
      // would bank up distance and dump a card the moment the cursor reached
      // the far gutter.
      last = { ...mouse };
    }
    rafId = requestAnimationFrame(render);
  };

  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  };

  // Fires before the first pointermove, which gives the images a head start —
  // the first card can't spawn until the cursor has travelled 80px anyway.
  trailSection.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') attachSources();
  });

  trailSection.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    attachSources();
    const rect = trailSection.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (!running) {
      running = true;
      measure();
      cache = { ...mouse };
      last = { ...mouse };
      rafId = requestAnimationFrame(render);
    }
  });

  // The reference leaves its rAF loop running forever once started; parking it
  // when the cursor leaves keeps the section from burning frames idly.
  trailSection.addEventListener('pointerleave', stop);
  window.addEventListener('blur', stop);
  window.addEventListener('resize', measure);
}
