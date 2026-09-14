const rawUrl = import.meta.env.VITE_API_URL;

export const API_URL = (rawUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '')).replace(
  /\/$/,
  ''
);

if (!API_URL) {
  console.error('VITE_API_URL is not configured. Set it in the Vercel environment.');
}
