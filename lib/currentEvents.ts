// Chronicle — Wikipedia's "Current events" portal as the News editor's source
// of the day's main world events, in place of GDELT (components/newsFeed.ts's
// fetchHeadlines, which is untouched and still used by the old DayCard.tsx).
//
// Parse rules below come from testing the actual wikitext across several
// dates (today, a recent day, 2022-02-24, and 2005-01-01): a bullet is a real
// event only if its cleaned text ends in a period — many parent bullets are
// bare topic links (e.g. `*[[Yemeni civil war]]`) with no sentence at all,
// and bullet DEPTH is not a reliable signal (it varies wildly by date, up to
// 5 levels deep on a heavily-tracked story). The '''Heading''' category line
// is also not guaranteed — absent entirely on at least one tested date — so
// events fall back to an "Other" category rather than failing.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatDateKey } from './dayEntry';
import type { Headline } from '@/components/newsFeed';

const API_USER_AGENT = 'ChronicleApp/1.0 (iOS journal app; current-events-reader; no contact URL yet)';

const TODAY_TTL_MS = 30 * 60 * 1000; // today's page fills in through the day
const cacheKey = (dateKey: string) => `current_events_cache_${dateKey}`;

type Cached = { fetchedAt: number; events: Headline[] };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pageTitleForDate = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  return `Portal:Current_events/${y}_${MONTHS[m - 1]}_${d}`;
};

// Strips wikilinks (keeping the label), bold/italic markup, HTML comments, and
// citation brackets ENTIRELY (dropped, not kept as trailing "(Outlet)" text —
// that belongs in domain/url, extracted separately from the raw line below).
const stripForTitle = (raw: string): string => {
  let s = raw;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/\[https?:\/\/[^\s\]]+[^\]]*\]/g, '');
  s = s.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/'''/g, '').replace(/''/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
};

const looksLikeSentence = (cleaned: string): boolean => cleaned.length > 20 && cleaned.endsWith('.');

const firstSentence = (text: string): string => {
  const m = /^(.*?[.!?])(\s|$)/.exec(text);
  return (m ? m[1] : text).trim();
};

type Citation = { url: string; outlet: string };

const extractCitations = (rawLine: string): Citation[] => {
  const out: Citation[] = [];
  const re = /\[(https?:\/\/[^\s\]]+)([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawLine))) {
    const url = m[1];
    const label = m[2].trim();
    const italic = /''([^']+)''/.exec(label);
    const outlet = italic ? italic[1] : label.replace(/[()]/g, '').trim();
    out.push({ url, outlet });
  }
  return out;
};

/** Exported for testing/reuse — pure, no I/O. */
export const parseCurrentEventsWikitext = (wikitext: string, dateKey: string): Headline[] => {
  const lines = wikitext.split('\n');
  let heading: string | null = null;
  const events: Headline[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('<!--')) continue;

    const headMatch = /^'''(.+?)'''\s*$/.exec(line);
    if (headMatch) {
      heading = headMatch[1].trim();
      continue;
    }

    const bulletMatch = /^(\*+)\s*(.+)$/.exec(line);
    if (!bulletMatch) continue;
    const content = bulletMatch[2];
    const cleaned = stripForTitle(content);
    if (!looksLikeSentence(cleaned)) continue; // a bare topic-link parent bullet, not an event

    const citations = extractCitations(content);
    const first = citations[0];
    events.push({
      title: firstSentence(cleaned),
      domain: first?.outlet || 'Wikipedia',
      url: first?.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitleForDate(dateKey))}`,
      category: heading || 'Other',
      kind: 'event',
    });
  }
  return events;
};

/**
 * null = the fetch itself failed (network, non-200, or an unparseable response)
 * — never cached. A valid but empty/thin result (today's page still filling
 * in, or a day with genuinely nothing recorded) returns [] and IS cached.
 */
export const fetchCurrentEvents = async (dateKey: string): Promise<Headline[] | null> => {
  const isToday = dateKey === formatDateKey(new Date());

  try {
    const raw = await AsyncStorage.getItem(cacheKey(dateKey));
    if (raw) {
      const cached: Cached = JSON.parse(raw);
      // past days: cached permanently, once fetched successfully. Today: 30 min.
      if (!isToday || Date.now() - cached.fetchedAt < TODAY_TTL_MS) {
        return cached.events;
      }
    }
  } catch {
    // fall through to a fresh fetch
  }

  try {
    const page = pageTitleForDate(dateKey);
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`;
    const res = await fetch(url, { headers: { 'Api-User-Agent': API_USER_AGENT } });
    if (!res.ok) return null;
    const data = await res.json();
    const wikitext = data?.parse?.wikitext?.['*'];
    if (typeof wikitext !== 'string') return null;

    const events = parseCurrentEventsWikitext(wikitext, dateKey);
    const cached: Cached = { fetchedAt: Date.now(), events };
    await AsyncStorage.setItem(cacheKey(dateKey), JSON.stringify(cached));
    return events;
  } catch {
    return null;
  }
};
