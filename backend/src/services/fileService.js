import { MAX_ATTACHMENT_CHARS } from '../utils/schemas.js';
import { badRequest } from '../utils/errors.js';

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|scss|js|jsx|mjs|cjs|ts|tsx|py|java|c|h|cpp|hpp|cs|go|rs|rb|php|swift|kt|kts|sql|sh|bash|zsh|ya?ml|toml|ini|env|log|r|m|lua|dart|vue|svelte)$/i;

function looksBinary(buf) {
  const n = Math.min(buf.length, 4096);
  let odd = 0;
  for (let i = 0; i < n; i++) {
    const b = buf[i];
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) odd++;
  }
  return n > 0 && odd / n > 0.1;
}

/** Extract readable text from an uploaded file (PDF or any text/code file). */
export async function extractText({ buffer, name = 'file', type = '' }) {
  if (!buffer?.length) throw badRequest('The file is empty');
  let text;
  let pages;
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name) || buffer.subarray(0, 5).toString() === '%PDF-';
  if (isPdf) {
    const { extractText: pdfText, getDocumentProxy } = await import('unpdf');
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const out = await pdfText(pdf, { mergePages: true });
      text = out.text;
      pages = out.totalPages;
    } catch {
      throw badRequest('Could not read that PDF. It may be encrypted or damaged.');
    }
    if (!text?.trim()) throw badRequest('That PDF has no selectable text (it may be a scanned image).');
  } else if (type.startsWith('text/') || /json|xml|javascript|csv|yaml/.test(type) || TEXT_EXT.test(name) || !looksBinary(buffer)) {
    text = buffer.toString('utf8');
  } else {
    throw badRequest('Nova can read PDFs and text files (code, CSV, JSON, Markdown and so on). This file type is not supported yet.');
  }
  text = text.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  const truncated = text.length > MAX_ATTACHMENT_CHARS;
  if (truncated) text = `${text.slice(0, MAX_ATTACHMENT_CHARS)}\n…(file truncated)`;
  return { name, type: isPdf ? 'application/pdf' : type || 'text/plain', size: buffer.length, text, truncated, ...(pages ? { pages } : {}) };
}
