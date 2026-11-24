import { calculate } from './calculator.js';
import { webSearch, readWebpage, wikipedia } from './web.js';
import { getWeather } from './weather.js';

/**
 * Free tools Nova can use (no API keys). Schemas follow the OpenAI function-calling format.
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, prices, people, places or anything you are unsure about. Returns titles, links and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        count: { type: 'integer', description: 'Number of results, 1-10 (default 6)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_webpage',
    description: 'Open a web page and read its text. Use it after web_search to read a result in full, or when the user shares a link.',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Full http(s) URL' } },
      required: ['url'],
    },
  },
  {
    name: 'get_weather',
    description: 'Current weather and a daily forecast for a city or place.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or place name, e.g. "Mumbai" or "Paris, France"' },
        days: { type: 'integer', description: 'Forecast days, 1-7 (default 3)' },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: 'Evaluate a maths expression exactly. Supports + - * / % ^, parentheses, sqrt, cbrt, abs, round, floor, ceil, sin, cos, tan, log (base 10), ln, exp, min, max, pow, pi, e.',
    parameters: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'e.g. "(1250*0.18)+sqrt(81)"' } },
      required: ['expression'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Current date and time, optionally in a given IANA time zone such as "Asia/Kolkata" or "America/New_York".',
    parameters: {
      type: 'object',
      properties: { timezone: { type: 'string', description: 'IANA time zone (default UTC)' } },
    },
  },
  {
    name: 'wikipedia',
    description: 'Look up an encyclopedia summary of a topic, person, place or concept on Wikipedia.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic to look up' },
        lang: { type: 'string', description: 'Wikipedia language code, e.g. "en", "hi" (default "en")' },
      },
      required: ['query'],
    },
  },
];

export const OPENAI_TOOLS = TOOL_DEFINITIONS.map((t) => ({ type: 'function', function: t }));

function currentTime(timezone) {
  const tz = timezone || 'UTC';
  const now = new Date();
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(now);
    return { timezone: tz, formatted, iso: now.toISOString() };
  } catch {
    return { error: `Unknown time zone "${tz}"`, utc: now.toISOString() };
  }
}

/** Run a tool by name. Always resolves (errors become { error }) so the model can recover. */
export async function runTool(name, args = {}) {
  try {
    switch (name) {
      case 'web_search':
        return await webSearch(String(args.query || ''), { count: args.count });
      case 'read_webpage':
        return await readWebpage(String(args.url || ''));
      case 'get_weather':
        return await getWeather(String(args.location || ''), { days: args.days });
      case 'calculate':
        return { expression: args.expression, result: calculate(args.expression) };
      case 'get_current_time':
        return currentTime(args.timezone);
      case 'wikipedia':
        return await wikipedia(String(args.query || ''), { lang: args.lang });
      default:
        return { error: `Unknown tool "${name}"` };
    }
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

/** A short human label for the chat UI, e.g. "Searching the web for “monsoon 2026”". */
export function describeTool(name, args = {}) {
  const q = (s) => `“${String(s).slice(0, 80)}”`;
  switch (name) {
    case 'web_search':
      return `Searching the web for ${q(args.query)}`;
    case 'read_webpage': {
      let host = args.url;
      try {
        host = new URL(args.url).hostname.replace(/^www\./, '');
      } catch {
        /* keep raw */
      }
      return `Reading ${host}`;
    }
    case 'get_weather':
      return `Checking the weather in ${args.location}`;
    case 'calculate':
      return `Calculating ${args.expression}`;
    case 'get_current_time':
      return `Checking the time${args.timezone ? ` in ${args.timezone}` : ''}`;
    case 'wikipedia':
      return `Looking up ${q(args.query)} on Wikipedia`;
    default:
      return `Using ${name}`;
  }
}
