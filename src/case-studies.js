// Single source of truth for the carousel on the homepage and the detail pages.
//
// `media` mirrors the Figma layout: rows of either one full-width frame or a
// pair side by side, each carrying the frame's own aspect ratio so the grid
// scales without ever letterboxing the artwork. Every item holds a `light` and
// a `dark` source — the design ships two complete sets of screens, so the theme
// toggle swaps artwork as well as chrome. An item with no sources renders the
// bordered placeholder frame from the design.
//
// Everything but Thrust still carries PLACEHOLDER copy.

// Real copy for the opening fold.
const THRUST_OVERVIEW = [
  'Thrust is a social meme coin launchpad that brings back the fun and energy of early crypto through a credible, user-friendly platform for discovering, creating, and participating in meme coins.',
  'I worked as the Lead Product Designer on this project, owning the entire design process—from research and ideation to branding and the final product. The project was completed within a 3-week timeline.',
];

// Real copy for the closing block.
const THRUST_OUTCOME = [
  'Thrust’s entire platform was designed and launched end-to-end in just 3 weeks, creating a stable, intuitive, and launch-ready experience for a real-world creator-led token launch. The platform powered N3on’s first token launch, which went on to reach a market capitalization in the millions within the Solana ecosystem.',
];

const THRUST_TAGS = [
  { label: 'Mobile Design', tone: 'green' },
  { label: 'Branding', tone: 'blue' },
  // The Figma frame says "1 Month"; the copy says three weeks, so the tag
  // follows the copy.
  { label: '3 Weeks', tone: 'pink' },
];

// Figma exports, one pair per frame. The numbers follow the order the rows
// appear on the page so a re-export can be dropped in without rewiring.
// The folder carries a version so a re-export can never be masked by a cached
// copy of the previous one — the URLs change, so there is nothing to revalidate.
const thrustShot = (n) => ({
  light: `/case-studies/thrust-v2/light-${n}.webp`,
  dark: `/case-studies/thrust-v2/dark-${n}.webp`,
});

// Real copy for the opening fold.
const HOBBES_OVERVIEW = [
  'Hobbes is an AI sales agent that runs conversational product demos 24/7, helping companies capture demand, educate buyers, qualify leads, and convert more prospects without waiting for a sales rep.',
  'I worked as the Lead Product Designer on this project, collaborating closely with the founders to shape product direction, design core workflows, and ship features grounded in real customer needs.',
];

// Real copy for the closing block.
const HOBBES_OUTCOME = [
  'The product redesign helped Hobbes strengthen its enterprise offering, making the platform more intuitive and scalable for larger teams while driving greater product adoption and helping convert more enterprise customers.',
];

// Two tags here rather than three — pink stays the timeline slot, as elsewhere.
const HOBBES_TAGS = [
  { label: 'Product Design', tone: 'green' },
  { label: 'Ongoing', tone: 'pink' },
];

// Figma ships only a light frame for Hobbes (section 291:10424 has one child,
// where Thrust has both "1" and "2"). Until a dark frame exists, both themes
// point at the same export rather than inventing a dark treatment.
const hobbesShot = (n) => {
  const src = `/case-studies/hobbes-v1/hob-${n}.webp`;
  return { light: src, dark: src };
};

// Real copy for the opening fold.
const CAMB_OVERVIEW = [
  'CAMB.AI is a production-grade speech AI platform for text-to-speech, live dubbing, and real-time translation across 150+ languages, powered by the MARS8 model family.',
  'I worked as the Lead Designer on this project, owning the redesign of CAMB.AI’s website and leading the product redesign, with a particular focus on the Dub Editor screens and end-to-end user flow. The project spanned 3 months.',
];

// Real copy for the closing block.
const CAMB_OUTCOME = [
  'Successfully redesigned and launched CAMB.AI’s website alongside the launch of their MARS8 model, creating a clearer, more modern digital experience that better positioned the product and showcased its next generation of speech AI capabilities.',
];

const CAMB_TAGS = [
  { label: 'Web Design', tone: 'green' },
  { label: 'Product Design', tone: 'blue' },
  { label: '3 Months', tone: 'pink' },
];

// Camb is the mirror of Hobbes: Figma ships a dark frame only (296:25231 is
// #121212), with no light counterpart, so one export serves both themes.
const cambShot = (n) => {
  const src = `/case-studies/camb-v1/camb-${n}.webp`;
  return { light: src, dark: src };
};

export const CASE_STUDIES = [
  {
    slug: 'thrust',
    title: 'Thrust',
    subtitle: 'Mobile & Web Design',
    icon: '/case-icons/thrust.svg',
    overview: THRUST_OVERVIEW,
    tags: THRUST_TAGS,
    // Figma 212:1232 repeats the overview copy verbatim under an "Outcome"
    // heading. Kept as its own field so the real outcome can replace it.
    // No tags on the closing block — they'd just repeat the header's.
    outcome: { heading: 'Outcome', body: THRUST_OUTCOME },
    media: [
      { layout: 'full', ratio: '1320 / 767', items: [thrustShot('01')] },
      { layout: 'pair', ratio: '648 / 713', items: [thrustShot('02'), thrustShot('03')] },
      { layout: 'full', ratio: '1320 / 767', items: [thrustShot('04')] },
      { layout: 'pair', ratio: '648 / 648', items: [thrustShot('05'), thrustShot('06')] },
      { layout: 'pair', ratio: '648 / 869', items: [thrustShot('07'), thrustShot('08')] },
      { layout: 'full', ratio: '1320 / 767', items: [thrustShot('09')] },
    ],
  },
  {
    slug: 'camb',
    title: 'Camb',
    subtitle: 'Product & Website Design',
    icon: '/case-icons/camb.svg',
    overview: CAMB_OVERVIEW,
    tags: CAMB_TAGS,
    // Closing block sits at the end, like the other studies. No tags — they'd
    // only repeat the header's.
    outcome: { heading: 'Outcome', body: CAMB_OUTCOME },
    media: [
      { layout: 'full', ratio: '1320 / 767', items: [cambShot('01')] },
      { layout: 'pair', ratio: '648 / 648', items: [cambShot('02'), cambShot('03')] },
      { layout: 'full', ratio: '1320 / 767', items: [cambShot('04')] },
      { layout: 'pair', ratio: '648 / 648', items: [cambShot('05'), cambShot('06')] },
      // Figma 296:25725 puts a second copy block here. Dropped — it only ever
      // held placeholder text, so the images now run straight through.
      { layout: 'full', ratio: '1320 / 767', items: [cambShot('07')] },
      { layout: 'pair', ratio: '648 / 648', items: [cambShot('08'), cambShot('09')] },
      { layout: 'full', ratio: '1320 / 767', items: [cambShot('10')] },
    ],
  },
  {
    slug: 'hobbes',
    title: 'Hobbes',
    subtitle: 'Product Design',
    icon: '/case-icons/hobbes.svg',
    overview: HOBBES_OVERVIEW,
    tags: HOBBES_TAGS,
    // No tags — they'd only repeat the header's.
    outcome: { heading: 'Outcome', body: HOBBES_OUTCOME },
    media: [
      { layout: 'full', ratio: '1320 / 767', items: [hobbesShot('01')] },
      { layout: 'pair', ratio: '648 / 648', items: [hobbesShot('02'), hobbesShot('03')] },
      { layout: 'full', ratio: '1320 / 767', items: [hobbesShot('04')] },
      { layout: 'pair', ratio: '648 / 648', items: [hobbesShot('05'), hobbesShot('06')] },
      { layout: 'full', ratio: '1320 / 767', items: [hobbesShot('07')] },
      { layout: 'full', ratio: '1320 / 767', items: [hobbesShot('08')] },
      { layout: 'full', ratio: '1320 / 767', items: [hobbesShot('09')] },
    ],
  },
  {
    slug: 'sutton',
    title: 'Sutton',
    subtitle: 'Web Design',
    icon: '/case-icons/sutton.svg',
    // Sutton has no case-study page of its own — the card and the info-bar arrow
    // both go straight to the live product site instead.
    externalUrl: 'https://www.digit-software.com/',
    overview: ['Add the overview for this project here.'],
    tags: ['Product Design', 'Add timeline', 'Add role'],
    media: [
      { layout: 'full', ratio: '1320 / 767', items: [{}] },
      { layout: 'pair', ratio: '648 / 713', items: [{}, {}] },
      { layout: 'full', ratio: '1320 / 767', items: [{}] },
      { layout: 'pair', ratio: '648 / 648', items: [{}, {}] },
    ],
  },
  {
    slug: 'sybill',
    title: 'Sybill',
    subtitle: 'Product Design',
    icon: '/case-icons/sybill.svg',
    // No case-study page of its own: the card and the info-bar arrow open the
    // Figma Slides deck directly, the same way Sutton points at its live site.
    externalUrl: 'https://www.figma.com/deck/Rmudmu9pFxyWhe2Z7iD7Hm',
    overview: ['Add the overview for this project here.'],
    tags: ['Product Design', 'Add timeline', 'Add role'],
    media: [
      { layout: 'full', ratio: '1320 / 767', items: [{}] },
      { layout: 'pair', ratio: '648 / 648', items: [{}, {}] },
      { layout: 'full', ratio: '1320 / 767', items: [{}] },
      { layout: 'pair', ratio: '648 / 648', items: [{}, {}] },
    ],
  },
];

// A study with an `externalUrl` links out rather than to /work/:slug.
export const caseStudyHref = (study) => study.externalUrl || `/work/${study.slug}`;

export const isExternal = (study) => Boolean(study.externalUrl);

export const caseStudyPath = (slug) => {
  const study = CASE_STUDIES.find((entry) => entry.slug === slug);
  return study ? caseStudyHref(study) : `/work/${slug}`;
};

export const findCaseStudy = (slug) =>
  CASE_STUDIES.find((study) => study.slug === slug) || null;
