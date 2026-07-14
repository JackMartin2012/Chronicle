import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const FOOTBALL_API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

export type WikiEvent = { year: number; text: string };

export type Headline = { title: string; domain: string; url?: string };

export type NewsCache = {
  fetchedAt: number;
  wikipedia: { events: WikiEvent[]; birth: WikiEvent | null } | null;
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
    return { events, birth };
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
export const fetchHeadlines = async (dateKey: string): Promise<Headline[] | null> => {
  try {
    const ymd = dateKey.replace(/-/g, '');
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=artlist&maxrecords=5&format=json&startdatetime=${ymd}000000&enddatetime=${ymd}235959`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const articles = data?.articles;
    if (!Array.isArray(articles)) return null;
    const seen = new Set<string>();
    const headlines: Headline[] = [];
    for (const a of articles) {
      const title = (a.title || '').trim();
      if (!title || seen.has(title)) continue;
      seen.add(title);
      headlines.push({ title, domain: a.domain || a.sourcecountry || 'News', url: a.url });
      if (headlines.length >= 4) break;
    }
    return headlines;
  } catch {
    return null;
  }
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
        if (settings.news && merged.headlines === undefined) {
          const hl = await fetchHeadlines(dateKey);
          merged = { ...merged, headlines: hl };
          changed = true;
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

  const cache: NewsCache = { fetchedAt: Date.now(), wikipedia: wiki, football, weather, headlines };
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
