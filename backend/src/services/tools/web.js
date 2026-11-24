import { safeFetch, stripTags, htmlToText } from './net.js';

function decodeBingLink(href) {
  try {
    const u = new URL(href.replace(/&amp;/g, '&'), 'https://www.bing.com');
    if (!u.hostname.endsWith('bing.com') || !u.pathname.startsWith('/ck/')) return u.href;
    const enc = u.searchParams.get('u');
    if (!enc?.startsWith('a1')) return null;
    return Buffer.from(enc.slice(2).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

async function bingSearch(query, count) {
  const res = await safeFetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&cc=US`);
  if (!res.ok) throw new Error(`Bing ${res.status}`);
  const results = [];
  for (const block of res.text.split(/<li class="b_algo"/).slice(1)) {
    const a = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const url = decodeBingLink(a[1]);
    if (!url || !/^https?:/.test(url)) continue;
    const snip = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || block.match(/class="b_caption"[^>]*>([\s\S]*?)<\/div>/i);
    results.push({ title: stripTags(a[2]), url, snippet: snip ? stripTags(snip[1]).slice(0, 300) : '' });
    if (results.length >= count) break;
  }
  return results;
}

async function duckInstant(query) {
  const res = await safeFetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
  const d = JSON.parse(res.text || '{}');
  const out = [];
  if (d.AbstractText) out.push({ title: d.Heading || query, url: d.AbstractURL, snippet: d.AbstractText });
  for (const t of d.RelatedTopics || []) {
    if (t.Text && t.FirstURL) out.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text });
    if (out.length >= 5) break;
  }
  return out;
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
  let results = [];
  let source = 'bing';
  try {
    results = await bingSearch(query, n);
  } catch {
    /* fall through */
  }
  if (!results.length) {
    source = 'duckduckgo';
    results = await duckInstant(query).catch(() => []);
  }
  if (!results.length) {
    source = 'wikipedia';
    const w = await wikipedia(query).catch(() => null);
    if (w?.summary) results = [{ title: w.title, url: w.url, snippet: w.summary }];
  }
  return { query, source, results };
}

export async function readWebpage(url, { maxChars = 12000 } = {}) {
  const res = await safeFetch(url);
  if (!res.ok) return { url: res.url, error: `The page returned HTTP ${res.status}` };
  if (/json/.test(res.contentType)) return { url: res.url, content: res.text.slice(0, maxChars) };
  if (!/html|text|xml/.test(res.contentType) && res.contentType) return { url: res.url, error: `Cannot read ${res.contentType} content` };
  const { title, text } = /html/.test(res.contentType) || /<html/i.test(res.text) ? htmlToText(res.text) : { title: '', text: res.text };
  return { url: res.url, title, content: text.slice(0, maxChars), truncated: text.length > maxChars };
}
