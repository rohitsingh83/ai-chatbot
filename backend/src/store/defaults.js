export const defaultPreferences = () => ({
  botName: 'Nova',
  theme: 'dark',
  accent: 'violet',
  defaultCategory: 'casual',
  language: 'auto',
  responseLength: 'balanced',
  sendOnEnter: true,
  customInstructions: '',
});

export const DAY = 24 * 60 * 60 * 1000;

/** ISO day keys for the last `days` days, oldest first. */
export function lastDays(days, now = new Date()) {
  const out = [];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(start.getTime() - i * DAY).toISOString().slice(0, 10));
  }
  return out;
}

/** Strip secrets before a user leaves the store layer. */
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, tokenVersion, ...rest } = u;
  return rest;
}
