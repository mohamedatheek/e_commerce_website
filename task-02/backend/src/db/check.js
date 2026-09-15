const { pool } = require('../config/db');
const { logger } = require('../utils/logger');
const { describeConnection, tableCounts } = require('./inspect');

async function check() {
  const client = await pool.connect();
  try {
    await describeConnection(client);
    const counts = await tableCounts(client);
    logger.info('Database connection successful');
    logger.info(`Products count: ${counts.products}`);
    logger.info(`Users count: ${counts.users}`);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  check()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error('Database check failed', error.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { check };
