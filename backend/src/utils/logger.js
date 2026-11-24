const ts = () => new Date().toISOString();
const quiet = process.env.NODE_ENV === 'test';
export const logger = {
  info: (...a) => !quiet && console.log(`[${ts()}] INFO`, ...a),
  warn: (...a) => !quiet && console.warn(`[${ts()}] WARN`, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
};
