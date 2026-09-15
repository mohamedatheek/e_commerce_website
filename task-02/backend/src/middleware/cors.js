const { env } = require('../config/env');

function allowedOrigins() {
  const extras = [
    env.frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ];
  return [...new Set(extras.filter(Boolean).map((origin) => origin.replace(/\/$/, '')))];
}

function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }

  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins().includes(normalized)) {
    return callback(null, true);
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
    return callback(null, true);
  }

  return callback(null, false);
}

module.exports = { corsOrigin, allowedOrigins };
