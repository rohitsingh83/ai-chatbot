import { safeFetch, stripTags, htmlToText } from './net.js';

async function duckInstant(query) {
  const res = await safeFetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
  const d = JSON.parse(res.text || '{}');
  const out = [];
  if (d.Answer) out.push({ title: 'Instant answer', url: d.AbstractURL || '', snippet: String(d.Answer) });
  if (d.AbstractText) out.push({ title: d.Heading || query, url: d.AbstractURL, snippet: d.AbstractText });
  for (const t of d.RelatedTopics || []) {
    if (t.Text && t.FirstURL) out.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text });
    if (out.length >= 4) break;
  }
  return out;
}

async function wikipediaSearch(query, count = 3) {
  const res = await safeFetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srprop=snippet|timestamp&srlimit=${count}&srsearch=${encodeURIComponent(query)}`,
  );
  return (JSON.parse(res.text).query?.search || []).map((h) => ({
    title: `${h.title} (Wikipedia)`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
    snippet: stripTags(h.snippet),
    updated: h.timestamp?.slice(0, 10),
  }));
}

/** Hacker News (Algolia's public API): good for tech news, launches and releases. */
const STOP = new Set('a an the of for to in on at is are was what which who how why when latest newest current recent today tell me about please and or with version stable new'.split(' '));
async function hackerNews(query, count = 4) {
  // Algolia needs every word to match, so keep only the meaningful ones.
  const q = query.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase())).join(' ') || query;
  const res = await safeFetch(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${count}&query=${encodeURIComponent(q)}`);
  return (JSON.parse(res.text).hits || [])
    .filter((h) => h.url && h.title)
    .map((h) => ({ title: h.title, url: h.url, snippet: `Discussed on Hacker News, ${h.points ?? 0} points`, date: h.created_at?.slice(0, 10) }));
}

/** Optional full web search with a (free-tier) API key: Tavily or Brave Search. */
async function keyedSearch(query, count) {
  if (process.env.TAVILY_API_KEY) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, max_results: count }),
    });
    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const d = await res.json();
    return { source: 'tavily', results: (d.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content?.slice(0, 400) })) };
  }
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?count=${count}&q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { accept: 'application/json', 'x-subscription-token': process.env.BRAVE_SEARCH_API_KEY },
    });
    if (!res.ok) throw new Error(`Brave ${res.status}`);
    const d = await res.json();
    return { source: 'brave', results: (d.web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: stripTags(r.description || '') })) };
  }
  return null;
}

export async function wikipedia(query, { lang = 'en' } = {}) {
  const base = `https://${/^[a-z]{2,3}$/.test(lang) ? lang : 'en'}.wikipedia.org`;
  const s = await safeFetch(`${base}/w/api.php?action=query&list=search&format=json&srlimit=3&srsearch=${encodeURIComponent(query)}`);
  const hits = JSON.parse(s.text).query?.search || [];
  if (!hits.length) return { query, results: [], note: 'No Wikipedia article found.' };
  const top = hits[0].title;
  const sum = await safeFetch(`${base}/api/rest_v1/page/summary/${encodeURIComponent(top.replace(/ /g, '_'))}`);
  const d = sum.ok ? JSON.parse(sum.text) : {};
  return {
    title: d.title || top,
    url: d.content_urls?.desktop?.page || `${base}/wiki/${encodeURIComponent(top.replace(/ /g, '_'))}`,
    summary: d.extract || stripTags(hits[0].snippet),
    otherArticles: hits.slice(1).map((h) => h.title),
  };
}

export async function webSearch(query, { count = 6 } = {}) {
  const n = Math.min(Math.max(Number(count) || 6, 1), 10);
  try {
    const keyed = await keyedSearch(query, n);
    if (keyed?.results.length) return { query, ...keyed };
  } catch {
    /* fall back to the free sources */
  }
  // Free, key-less sources with public APIs.
  const settled = await Promise.allSettled([duckInstant(query), wikipediaSearch(query, 3), hackerNews(query, 4)]);
  const [ddg, wiki, hn] = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const seen = new Set();
  const results = [...ddg, ...wiki, ...hn].filter((r) => r.url && !seen.has(r.url) && seen.add(r.url)).slice(0, n + 2);
  return {
    query,
    source: 'duckduckgo-instant-answers + wikipedia + hacker-news',
    results,
    tip: 'These free sources cover encyclopedic facts and tech news, not the whole web. If they do not answer the question, open the most likely official page directly with read_webpage (for example a project\'s website, docs, blog or GitHub releases page) instead of searching again.',
  };
}

export async function readWebpage(url, { maxChars = 12000 } = {}) {
  const res = await safeFetch(url);
  if (!res.ok) return { url: res.url, error: `The page returned HTTP ${res.status}` };
  if (/json/.test(res.contentType)) return { url: res.url, content: res.text.slice(0, maxChars) };
  if (!/html|text|xml/.test(res.contentType) && res.contentType) return { url: res.url, error: `Cannot read ${res.contentType} content` };
  const { title, text } = /html/.test(res.contentType) || /<html/i.test(res.text) ? htmlToText(res.text) : { title: '', text: res.text };
  return { url: res.url, title, content: text.slice(0, maxChars), truncated: text.length > maxChars };
}
