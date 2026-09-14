const { env } = require('./config/env');
const { pool } = require('./config/db');
const { logger } = require('./utils/logger');
const { expireOldReservations } = require('./services/reservationService');
const app = require('./app');

const server = app.listen(env.port, '0.0.0.0', () => {
  logger.info(`API listening on 0.0.0.0:${env.port}`);
});

const expiryTimer = setInterval(() => {
  expireOldReservations().catch((error) => {
    logger.warn('Expiry sweep failed', error.message);
  });
}, 30 * 1000);

if (typeof expiryTimer.unref === 'function') {
  expiryTimer.unref();
}

expireOldReservations().catch((error) => {
  logger.warn('Initial expiry sweep failed', error.message);
});

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down`);
  clearInterval(expiryTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
