import { safeFetch } from './net.js';

const CODES = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'rime fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'heavy freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light showers', 81: 'showers', 82: 'violent showers', 85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail',
};

export async function getWeather(location, { days = 3 } = {}) {
  const g = await safeFetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(location)}`);
  const place = JSON.parse(g.text).results?.[0];
  if (!place) return { error: `Could not find a place called "${location}"` };
  const n = Math.min(Math.max(Number(days) || 3, 1), 7);
  const q = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: 'auto',
    forecast_days: String(n),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  });
  const f = JSON.parse((await safeFetch(`https://api.open-meteo.com/v1/forecast?${q}`)).text);
  const c = f.current || {};
  return {
    place: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
    localTime: c.time,
    current: {
      temperatureC: c.temperature_2m,
      feelsLikeC: c.apparent_temperature,
      humidityPct: c.relative_humidity_2m,
      windKmh: c.wind_speed_10m,
      precipitationMm: c.precipitation,
      conditions: CODES[c.weather_code] || 'unknown',
    },
    forecast: (f.daily?.time || []).map((d, i) => ({
      date: d,
      minC: f.daily.temperature_2m_min[i],
      maxC: f.daily.temperature_2m_max[i],
      rainChancePct: f.daily.precipitation_probability_max?.[i],
      conditions: CODES[f.daily.weather_code[i]] || 'unknown',
    })),
    source: 'Open-Meteo',
  };
}
