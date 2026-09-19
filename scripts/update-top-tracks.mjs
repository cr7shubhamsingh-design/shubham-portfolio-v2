// Builds data/top-tracks.json: the miniplayer's monthly playlist.
//
// Run by .github/workflows/top-tracks.yml on the 15th of every month. Reads the
// last 30 days of listening from Last.fm, keeps one song per artist (their most
// played), and pairs each with a 30s preview and cover from the iTunes catalogue
// — Last.fm has no audio and has dropped most of its artwork. The site fetches
// the JSON at runtime; if this script fails, the file is left untouched and the
// site keeps last month's list.
//
//   LASTFM_API_KEY=... LASTFM_USER=Aribum node scripts/update-top-tracks.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_KEY = process.env.LASTFM_API_KEY;
const USER = process.env.LASTFM_USER || 'Aribum';
const WANT = 20;
// Fewer playable songs than this means something went wrong upstream (a bad
// Last.fm response, iTunes throttling) — better to keep last month's list.
const MIN_TRACKS = 10;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'top-tracks.json');

// For testing the matching without a key: a saved user.gettoptracks response.
const FIXTURE = process.env.LASTFM_FIXTURE;

if (!API_KEY && !FIXTURE) {
  console.error('LASTFM_API_KEY is not set');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// iTunes Search allows roughly 20 requests a minute per IP.
let lastItunesCall = 0;
const itunes = async (params, endpoint = 'search') => {
  const wait = lastItunesCall + 3200 - Date.now();
  if (wait > 0) await sleep(wait);
  lastItunesCall = Date.now();
  const base = endpoint === 'search' ? { media: 'music', entity: 'song', country: 'us' } : { entity: 'song', country: 'us' };
  const url = `https://itunes.apple.com/${endpoint}?${new URLSearchParams({ ...base, ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()).results || [];
    if (res.status !== 403 && res.status !== 429) throw new Error(`iTunes ${res.status}`);
    await sleep(20000 * (attempt + 1));
  }
  throw new Error('iTunes kept rate-limiting');
};

// Lowercase, strip accents, drop "(feat. …)" / "[Remastered]" / " - Radio Edit"
// tails and punctuation, so Last.fm's and Apple's spellings compare equal.
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s*[([][^)\]]*[)\]]/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9぀-ヿ㐀-鿿가-힯]+/g, ' ')
    .trim();

const VARIANT = /\b(remix|sped ?up|slowed|nightcore|karaoke|instrumental|live|acoustic|cover|8d|reverb|piano|lofi|lo-fi)\b/i;
const EXPLICIT_RANK = { explicit: 0, notExplicit: 1, cleaned: 2 };

const pickMatch = (results, title, artist) => {
  const t = norm(title);
  const a = norm(artist);
  // Only reject variants the scrobbled title doesn't itself ask for.
  const allowVariant = VARIANT.test(title);
  const scored = results
    .filter((r) => r.previewUrl && r.kind === 'song')
    .map((r) => {
      const rt = norm(r.trackName);
      const ra = norm(r.artistName);
      const artistOk = ra === a || ra.includes(a) || a.includes(ra);
      let titleScore = 0;
      if (rt === t) titleScore = 2;
      else if (rt.startsWith(t) || t.startsWith(rt)) titleScore = 1;
      const variant = !allowVariant && VARIANT.test(`${r.trackName} ${r.collectionName || ''}`);
      return { r, ok: artistOk && titleScore > 0 && !variant, titleScore, ra, a };
    })
    .filter((x) => x.ok)
    .sort(
      (x, y) =>
        y.titleScore - x.titleScore ||
        // an exact artist match beats a collab credit that merely contains it
        Number(y.ra === y.a) - Number(x.ra === x.a) ||
        (EXPLICIT_RANK[x.r.trackExplicitness] ?? 3) - (EXPLICIT_RANK[y.r.trackExplicitness] ?? 3),
    );
  return scored[0]?.r || null;
};

const findOnItunes = async (title, artist) => {
  const first = await itunes({ term: `${artist} ${norm(title) || title}`, limit: '25' });
  const hit = pickMatch(first, title, artist);
  if (hit) return hit;
  // Some titles only surface when searched on their own.
  const second = pickMatch(await itunes({ term: title, limit: '50' }), title, artist);
  if (second) return second;
  // And some never surface in search at all (album cuts from big catalogues),
  // but are there in the artist's own song list.
  const artists = await itunes({ term: artist, entity: 'musicArtist', limit: '3' });
  const artistId = artists.find((x) => norm(x.artistName) === norm(artist))?.artistId;
  if (!artistId) return null;
  const songs = await itunes({ id: String(artistId), limit: '200' }, 'lookup');
  const third = pickMatch(songs.filter((x) => x.wrapperType === 'track'), title, artist);
  if (third) return third;
  // Last resort for big catalogues, where that song list is cut off at 200:
  // walk the artist's albums, ten per lookup (lookup takes comma-separated ids).
  const albums = (await itunes({ id: String(artistId), entity: 'album', limit: '200' }, 'lookup')).filter(
    (x) => x.wrapperType === 'collection',
  );
  for (let i = 0; i < Math.min(albums.length, 80); i += 10) {
    const ids = albums.slice(i, i + 10).map((x) => x.collectionId).join(',');
    const albumSongs = await itunes({ id: ids, limit: '200' }, 'lookup');
    const hit = pickMatch(albumSongs.filter((x) => x.wrapperType === 'track'), title, artist);
    if (hit) return hit;
  }
  return null;
};

const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({
  method: 'user.gettoptracks',
  user: USER,
  period: '1month',
  limit: '200',
  api_key: API_KEY,
  format: 'json',
})}`;
let lastfm;
if (FIXTURE) {
  lastfm = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
} else {
  const lastfmRes = await fetch(lastfmUrl);
  lastfm = await lastfmRes.json();
  if (!lastfmRes.ok || lastfm.error) {
    console.error('Last.fm error:', lastfm.message || lastfmRes.status);
    process.exit(1);
  }
}
const top = lastfm.toptracks?.track || [];
console.log(`Last.fm: ${top.length} tracks for ${USER} over the last 30 days`);

const seenArtists = new Set();
const tracks = [];
const skipped = [];

for (const item of top) {
  if (tracks.length >= WANT) break;
  const title = item.name;
  const artist = item.artist?.name || item.artist?.['#text'] || '';
  const artistKey = norm(artist);
  // One song per artist: their highest-ranked playable one. The artist is only
  // marked as taken once a song is actually used, so if their top song has no
  // preview their next-best one gets the slot instead.
  if (seenArtists.has(artistKey)) continue;

  let match = null;
  try {
    match = await findOnItunes(title, artist);
  } catch (error) {
    console.error(`iTunes lookup failed for ${artist} — ${title}:`, error.message);
    process.exit(1);
  }
  if (!match) {
    skipped.push(`${artist} — ${title}`);
    continue;
  }

  seenArtists.add(artistKey);
  tracks.push({
    title,
    artist,
    src: match.previewUrl,
    cover: match.artworkUrl100.replace(/\/[^/]+\.(jpg|png|webp)$/, '/1000x1000bb.jpg'),
    spotify: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`,
    rank: Number(item['@attr']?.rank) || null,
    plays: Number(item.playcount) || null,
  });
  console.log(`  #${item['@attr']?.rank} ${artist} — ${title}  →  ${match.artistName} — ${match.trackName}`);
}

if (skipped.length) console.log(`No iTunes preview, skipped: ${skipped.join('; ')}`);

if (tracks.length < MIN_TRACKS) {
  console.error(`Only ${tracks.length} playable tracks — keeping the existing list.`);
  process.exit(1);
}

const outFile = process.env.OUT_FILE || OUT;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(
  outFile,
  `${JSON.stringify({ user: USER, period: 'last 30 days', generatedAt: new Date().toISOString(), tracks }, null, 2)}\n`,
);
console.log(`Wrote ${tracks.length} tracks to data/top-tracks.json`);
