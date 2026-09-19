import { initTheme } from './theme.js';
import { initNavHome } from './nav.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { CASE_STUDIES, findCaseStudy, caseStudyHref, isExternal } from './case-studies.js';

initTheme();
initNavHome();
initSmoothScroll();

// Slug comes from /work/:slug via the Vercel rewrite, and falls back to
// ?slug= so the page still works on the raw /case-study.html URL in dev.
const slugFromPath = window.location.pathname.match(/\/work\/([\w-]+)\/?$/)?.[1];
const slug = slugFromPath || new URLSearchParams(window.location.search).get('slug');
const studyIndex = Math.max(0, CASE_STUDIES.findIndex((entry) => entry.slug === slug));
const study = findCaseStudy(slug) || CASE_STUDIES[0];

document.title = `${study.title.toLowerCase()} — shubham.`;

// Both back controls point at /#work so a shared link still works. But when the
// visitor came from the site, step back through history instead: that restores
// the homepage exactly where they left it, carousel position and all.
const cameFromSite = (() => {
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch (error) {
    return false;
  }
})();

document.querySelectorAll('.case__back, .site-nav__back').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (cameFromSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
});

// The nav pill sits alone until the visitor starts scrolling, then gains a
// control on each side and keeps them for the rest of the page:
//
//   at the top   →  [ shubham. ]
//   scrolling    →  [ previous ][ shubham. ][ next ]
//
// The pair steps through the deck in carousel order. On the first study there
// is nothing before it, so the left pill reads "back" and returns to the work
// section rather than to another study.
const caseNav = document.querySelector('.site-nav--case');
const jump = document.getElementById('case-jump');
const nextPill = document.getElementById('case-next');

if (caseNav && jump && nextPill) {
  // Both pills come up together, as soon as the visitor starts moving. A few
  // pixels rather than zero, so a rubber-band or a restored scroll position
  // doesn't count as having set off.
  const SCROLL_START = 8;
  let scrolled = window.scrollY > SCROLL_START;

  // Collapsed pills keep their DOM but leave the tab order and the a11y tree,
  // so a keyboard user never lands on a control they can't see.
  const setCollapsed = (el, collapsed) => {
    el.tabIndex = collapsed ? -1 : 0;
    el.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  };

  // Studies that live off-site (Sutton, Sybill) open in a new tab from the pills
  // for the same reason their cards do — so the portfolio isn't lost.
  const pointAt = (el, study, label) => {
    el.textContent = label;
    el.href = caseStudyHref(study);
    el.setAttribute('aria-label', `${label === 'previous' ? 'Previous' : 'Next'} case study: ${study.title}`);
    if (isExternal(study)) {
      el.target = '_blank';
      el.rel = 'noopener';
    } else {
      el.removeAttribute('target');
      el.removeAttribute('rel');
    }
  };

  // The deck runs previous <- this -> next. The first study has nothing before
  // it, so its left pill goes back to the work section instead.
  const prevStudy = studyIndex > 0 ? CASE_STUDIES[studyIndex - 1] : null;
  const nextStudy = CASE_STUDIES[(studyIndex + 1) % CASE_STUDIES.length];

  if (prevStudy) {
    jump.dataset.mode = 'previous';
    pointAt(jump, prevStudy, 'previous');
  } else {
    jump.dataset.mode = 'back';
    jump.textContent = 'back';
    jump.href = '/#work';
    jump.setAttribute('aria-label', 'Back to work');
  }

  pointAt(nextPill, nextStudy, 'next');

  const sync = () => {
    caseNav.dataset.back = scrolled ? 'visible' : 'hidden';
    caseNav.dataset.next = scrolled ? 'visible' : 'hidden';
    setCollapsed(jump, !scrolled);
    setCollapsed(nextPill, !scrolled);
  };

  sync();

  window.addEventListener(
    'scroll',
    () => {
      const isScrolled = window.scrollY > SCROLL_START;
      if (isScrolled === scrolled) return;
      scrolled = isScrolled;
      sync();
    },
    { passive: true },
  );

  jump.addEventListener('click', (event) => {
    // Only the first study's "back" retraces history; "previous" is a plain
    // link to the study before this one.
    if (jump.dataset.mode !== 'back') return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (cameFromSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });
}

// ---------- copy ----------

// Tags ship either as plain strings (studies still on placeholder copy) or as
// { label, tone } once the real palette from Figma is in place.
const renderTags = (list, target) => {
  if (!target) return;
  target.replaceChildren();
  // An empty list still takes its share of the column's 24px gap, so the row
  // has to leave the layout rather than just render nothing.
  target.hidden = !(list && list.length);
  (list || []).forEach((tag) => {
    const { label, tone } = typeof tag === 'string' ? { label: tag, tone: null } : tag;
    const li = document.createElement('li');
    li.className = tone ? `case__tag case__tag--${tone}` : 'case__tag';
    li.textContent = label;
    target.appendChild(li);
  });
};

const renderBody = (paragraphs, target) => {
  if (!target) return;
  target.replaceChildren();
  (paragraphs || []).forEach((paragraph) => {
    const p = document.createElement('p');
    p.className = 'case__paragraph';
    p.textContent = paragraph;
    target.appendChild(p);
  });
};

// The Figma heading reads "Overview"; the project name lives in the tab title
// and the card the visitor came from.
document.getElementById('case-heading').textContent = 'Overview';
renderBody(study.overview, document.getElementById('case-overview'));
renderTags(study.tags, document.getElementById('case-tags'));

// ---------- media ----------

// Every row carries its own aspect ratio because the design's frames are not a
// uniform height — 767, 713, 648 and 869 all appear — and letterboxing a
// screenshot to a shared ratio would crop the phone mockups.
const mediaEl = document.getElementById('case-media');

// A copy block can sit between media rows rather than only at the end — Camb
// (296:25725) breaks its stack after the fourth row. Built from the same parts
// as the header so the column lands on the identical 700px measure.
const buildTextRow = (row) => {
  const section = document.createElement('section');
  section.className = 'case__row case__row--text';

  const intro = document.createElement('div');
  intro.className = 'case__intro';

  const heading = document.createElement('h2');
  heading.className = 'case__heading';
  heading.textContent = row.heading || 'Outcome';
  intro.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'case__intro-body';

  const copy = document.createElement('div');
  copy.className = 'case__overview';
  renderBody(row.body, copy);
  body.appendChild(copy);

  if (row.tags && row.tags.length) {
    const tags = document.createElement('ul');
    tags.className = 'case__tags';
    renderTags(row.tags, tags);
    body.appendChild(tags);
  }

  intro.appendChild(body);
  section.appendChild(intro);
  return section;
};

study.media.forEach((row) => {
  if (row.layout === 'text') {
    mediaEl.appendChild(buildTextRow(row));
    return;
  }

  const rowEl = document.createElement('div');
  rowEl.className = `case__row case__row--${row.layout}`;

  row.items.forEach((item) => {
    const frame = document.createElement('figure');
    frame.className = 'case__frame';
    if (row.ratio) frame.style.aspectRatio = row.ratio;

    if (item && item.light && item.dark) {
      // Both themes render at once, stacked, with only opacity separating
      // them. Swapping `src` on toggle would decode mid-transition and flash;
      // this keeps the switch instant, which is the whole point of the
      // View Transition crossfade doing the smoothing.
      frame.classList.add('case__frame--shot');

      [['light', item.light], ['dark', item.dark]].forEach(([theme, src]) => {
        const img = document.createElement('img');
        img.className = `case__img case__img--${theme}`;
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        frame.appendChild(img);
      });
    } else {
      // Empty bordered frame, exactly as the design ships it — a slot waiting
      // for artwork rather than a broken image.
      frame.classList.add('case__frame--empty');
    }

    rowEl.appendChild(frame);
  });

  mediaEl.appendChild(rowEl);
});

// ---------- outcome ----------

const outcomeEl = document.getElementById('case-outcome');

if (study.outcome && outcomeEl) {
  document.getElementById('case-outcome-heading').textContent = study.outcome.heading || 'Outcome';
  renderBody(study.outcome.body, document.getElementById('case-outcome-body'));
  renderTags(study.outcome.tags, document.getElementById('case-outcome-tags'));
  outcomeEl.hidden = false;
}

