const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  override: true,
});

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function databaseUrl() {
  const value = required('DATABASE_URL');
  const looksLikePlaceholder =
    /@HOST(?:\/|:|\?|$)/i.test(value) ||
    value.includes('USER:PASSWORD') ||
    value.includes('YOUR_LOCAL_PASSWORD') ||
    value.includes('YOUR_PASSWORD');
  if (looksLikePlaceholder) {
    throw new Error(
      'DATABASE_URL is still the placeholder from .env.example. Open task-02/backend/.env and paste your Neon connection string, then run npm run migrate && npm run seed && npm run dev.'
    );
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: databaseUrl(),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  reservationMinutes: Number(process.env.RESERVATION_MINUTES) || 5,
  demoUserId: process.env.DEMO_USER_ID || '11111111-1111-4111-8111-111111111111',
};

module.exports = { env };
