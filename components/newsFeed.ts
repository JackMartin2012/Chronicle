import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const FOOTBALL_API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

export type WikiEvent = { year: number; text: string };

export type Headline = { title: string; domain: string; url?: string };

export type NewsCache = {
  fetchedAt: number;
  // `archive` = curated events from ANY year for this calendar date (used by the
  // new day card's Newspaper slide). Separate from `events` on purpose: the old
  // DayCard shows `events` and relies on them being same-year. Absent on caches
  // written before it existed.
  wikipedia: { events: WikiEvent[]; birth: WikiEvent | null; archive?: WikiEvent[] } | null;
  football: any[] | null;
  weather: { max: number; min: number; emoji: string } | null;
  headlines?: Headline[] | null;
};

export type NewsSettings = { wiki: boolean; football: boolean; weather: boolean; news: boolean };

export const wmoEmoji = (code: number | null | undefined): string => {
  if (code == null) return '🌤️';
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code === 51 || code === 53 || code === 55) return '🌦️';
  if (code === 61 || code === 63 || code === 65) return '🌧️';
  if (code === 71 || code === 73 || code === 75) return '❄️';
  if (code === 80 || code === 81 || code === 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
};

export const fetchWikipedia = async (dateKey: string, year: string) => {
  try {
    const [, mm, dd] = dateKey.split('-');
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`);
    if (!res.ok) return null;
    const data = await res.json();
    const yearNum = parseInt(year);
    const pool = [...(data.selected || []), ...(data.events || [])];
    const seen = new Set<string>();
    const events: WikiEvent[] = [];
    for (const e of pool) {
      if (e.year !== yearNum) continue;
      if (seen.has(e.text)) continue;
      seen.add(e.text);
      events.push({ year: e.year, text: e.text });
      if (events.length >= 5) break;
    }
    const b = (data.births || []).find((x: any) => x.year === yearNum);
    const birth: WikiEvent | null = b ? { year: b.year, text: b.text } : null;

    // any-year archive: curated entries first, other years only (same-year ones
    // are already in `events`), capped
    const archive: WikiEvent[] = [];
    const seenArchive = new Set<string>();
    for (const e of pool) {
      if (e.year === yearNum || typeof e.year !== 'number' || !e.text) continue;
      if (seenArchive.has(e.text)) continue;
      seenArchive.add(e.text);
      archive.push({ year: e.year, text: e.text });
      if (archive.length >= 6) break;
    }
    return { events, birth, archive };
  } catch {
    return null;
  }
};

export const fetchFootball = async (dateKey: string) => {
  if (!FOOTBALL_API_KEY) return null;
  try {
    const availRaw = await AsyncStorage.getItem('football_requests_available');
    const resetRaw = await AsyncStorage.getItem('football_reset_time');
    if (availRaw !== null && parseInt(availRaw) < 3 && resetRaw && parseInt(resetRaw) > Date.now()) {
      return null;
    }
    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateKey}&dateTo=${dateKey}`,
      { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
    );
    if (res.status === 429) return null;
    const avail = res.headers.get('X-RequestsAvailable') || res.headers.get('X-Requests-Available-Minute');
    if (avail) await AsyncStorage.setItem('football_requests_available', avail);
    const reset = res.headers.get('X-RequestCounter-Reset');
    if (reset) await AsyncStorage.setItem('football_reset_time', String(Date.now() + parseInt(reset) * 1000));
    if (!res.ok) return null;
    const data = await res.json();
    return (data.matches || []).slice(0, 5);
  } catch {
    return null;
  }
};

export const fetchHistoricWeather = async (dateKey: string) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&start_date=${dateKey}&end_date=${dateKey}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const max = data?.daily?.temperature_2m_max?.[0];
    const min = data?.daily?.temperature_2m_min?.[0];
    const code = data?.daily?.weathercode?.[0];
    if (max == null || min == null) return null;
    return { max: Math.round(max), min: Math.round(min), emoji: wmoEmoji(code) };
  } catch {
    return null;
  }
};

export const getNewsSettings = async (): Promise<NewsSettings> => {
  const wiki = (await AsyncStorage.getItem('show_wikipedia_feed')) !== 'false';
  const football = (await AsyncStorage.getItem('show_football_feed')) === 'true';
  const weather = (await AsyncStorage.getItem('show_weather_feed')) !== 'false';
  const news = (await AsyncStorage.getItem('show_news_feed')) !== 'false';
  return { wiki, football, weather, news };
};

// GDELT — free live/archive headlines, no API key. Only has data from ~2017 onwards.
// GDELT asks for at most one request every 5 seconds and returns a plain-text
// 429 (not JSON) if you go faster — easy to hit from a cold app start or two
// screens opening close together. The three pieces below all exist for that:
// a shared queue spaces out every request this module makes (any date, not
// just repeats of the same one) by at least GDELT_MIN_GAP_MS; a 429 specifically
// (not any other failure) gets one retry after GDELT_RETRY_DELAY_MS; and calls
// for the SAME dateKey made while one is already in flight share its result
// instead of firing a second request.
const GDELT_MIN_GAP_MS = 5000;
const GDELT_RETRY_DELAY_MS = 6000;

let gdeltLastRequestAt = 0;
let gdeltQueue: Promise<unknown> = Promise.resolve();
const headlinesInFlight = new Map<string, Promise<Headline[] | null>>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One network attempt, serialised through the shared queue so it's never
 * fired within GDELT_MIN_GAP_MS of another request this module has made. */
const gdeltFetch = (url: string): Promise<Response> => {
  const run = gdeltQueue.then(async () => {
    const wait = GDELT_MIN_GAP_MS - (Date.now() - gdeltLastRequestAt);
    if (wait > 0) await sleep(wait);
    gdeltLastRequestAt = Date.now();
    return fetch(url);
  });
  // keep the queue moving even if this attempt throws — a failed request
  // shouldn't jam every request queued behind it
  gdeltQueue = run.catch(() => undefined);
  return run;
};

const parseHeadlines = (data: any): Headline[] | null => {
  const articles = data?.articles;
  if (!Array.isArray(articles)) return null;
  const seen = new Set<string>();
  const headlines: Headline[] = [];
  for (const a of articles) {
    const title = (a.title || '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    headlines.push({ title, domain: a.domain || a.sourcecountry || 'News', url: a.url });
    if (headlines.length >= 5) break;
  }
  return headlines;
};

const fetchHeadlinesUncached = async (dateKey: string): Promise<Headline[] | null> => {
  const ymd = dateKey.replace(/-/g, '');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=artlist&maxrecords=5&format=json&startdatetime=${ymd}000000&enddatetime=${ymd}235959`;

  const attempt = async (): Promise<{ rateLimited: boolean; headlines: Headline[] | null }> => {
    try {
      const res = await gdeltFetch(url);
      if (res.status === 429) return { rateLimited: true, headlines: null };
      if (!res.ok) return { rateLimited: false, headlines: null };
      return { rateLimited: false, headlines: parseHeadlines(await res.json()) };
    } catch {
      return { rateLimited: false, headlines: null };
    }
  };

  let result = await attempt();
  if (result.rateLimited) {
    await sleep(GDELT_RETRY_DELAY_MS);
    result = await attempt();
  }
  return result.headlines;
};

export const fetchHeadlines = (dateKey: string): Promise<Headline[] | null> => {
  const existing = headlinesInFlight.get(dateKey);
  if (existing) return existing;
  const promise = fetchHeadlinesUncached(dateKey).finally(() => {
    headlinesInFlight.delete(dateKey);
  });
  headlinesInFlight.set(dateKey, promise);
  return promise;
};

// Loads the full news bundle for a date, using the 30-day cache when valid.
export const loadNewsForDay = async (
  dateKey: string
): Promise<{ cache: NewsCache | null; settings: NewsSettings }> => {
  const settings = await getNewsSettings();
  const year = dateKey.split('-')[0];

  const cachedRaw = await AsyncStorage.getItem(`news_cache_${dateKey}`);
  if (cachedRaw) {
    try {
      const cached: NewsCache = JSON.parse(cachedRaw);
      if (cached.fetchedAt && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
        let merged = cached;
        let changed = false;
        if (settings.football && !merged.football) {
          const fb = await fetchFootball(dateKey);
          if (fb) { merged = { ...merged, football: fb }; changed = true; }
        }
        // caches written before `archive` existed: backfill it once
        if (settings.wiki && merged.wikipedia && merged.wikipedia.archive === undefined) {
          const wiki = await fetchWikipedia(dateKey, year);
          if (wiki) { merged = { ...merged, wikipedia: wiki }; changed = true; }
        }
        if (settings.news && merged.headlines === undefined) {
          const hl = await fetchHeadlines(dateKey);
          // null = the fetch failed (rate-limited or otherwise), not "genuinely no
          // headlines" (that's []). Leave `headlines` undefined so the NEXT open,
          // still within this 30-day cache window, retries instead of treating
          // the failure as "already fetched".
          if (hl !== null) {
            merged = { ...merged, headlines: hl };
            changed = true;
          }
        }
        if (changed) await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(merged));
        return { cache: merged, settings };
      }
    } catch { }
  }

  const [wiki, football, weather, headlines] = await Promise.all([
    settings.wiki ? fetchWikipedia(dateKey, year) : Promise.resolve(null),
    settings.football ? fetchFootball(dateKey) : Promise.resolve(null),
    settings.weather ? fetchHistoricWeather(dateKey) : Promise.resolve(null),
    settings.news ? fetchHeadlines(dateKey) : Promise.resolve(null),
  ]);

  const cache: NewsCache = {
    fetchedAt: Date.now(),
    wikipedia: wiki,
    football,
    weather,
    // settings off → null (deliberately not fetched; the settings check above
    // already stops this from retrying every open). Fetch failed → leave the
    // key OUT of the object (undefined — JSON.stringify drops it) so a later
    // open within the 30-day window retries rather than caching the failure.
    // Genuine empty result → [].
    headlines: settings.news ? (headlines ?? undefined) : null,
  };
  await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(cache));
  return { cache, settings };
};

// Enable headlines and merge results into an existing cache (used by the inline toggle).
export const enableHeadlinesAndMerge = async (
  dateKey: string,
  cache: NewsCache | null
): Promise<NewsCache | null> => {
  await AsyncStorage.setItem('show_news_feed', 'true');
  if (cache && !cache.headlines) {
    const hl = await fetchHeadlines(dateKey);
    if (hl) {
      const merged = { ...cache, headlines: hl };
      await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(merged));
      return merged;
    }
  }
  return cache;
};

// Enable football and merge results into an existing cache (used by the inline toggle).
export const enableFootballAndMerge = async (
  dateKey: string,
  cache: NewsCache | null
): Promise<NewsCache | null> => {
  await AsyncStorage.setItem('show_football_feed', 'true');
  if (cache && !cache.football) {
    const fb = await fetchFootball(dateKey);
    if (fb) {
      const merged = { ...cache, football: fb };
      await AsyncStorage.setItem(`news_cache_${dateKey}`, JSON.stringify(merged));
      return merged;
    }
  }
  return cache;
};
