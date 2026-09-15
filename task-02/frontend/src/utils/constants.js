const rawUrl = import.meta.env.VITE_API_URL;

function normalizeApiUrl(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_URL = normalizeApiUrl(rawUrl) || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

if (!import.meta.env.DEV && !rawUrl) {
  console.error('VITE_API_URL is not configured. Set it in the Vercel environment at build time.');
}
