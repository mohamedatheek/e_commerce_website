const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { logger } = require('../utils/logger');
const { migrate } = require('./migrate');

async function seed() {
  await migrate();

  const seedsDir = path.resolve(__dirname, '../../seeds');
  const files = fs
    .readdirSync(seedsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const sql = fs.readFileSync(path.join(seedsDir, filename), 'utf8');
    await pool.query(sql);
    logger.info(`Seeded ${filename}`);
  }
}

if (require.main === module) {
  seed()
    .then(async () => {
      logger.info('Seed complete');
      await pool.end();
    })
    .catch(async (error) => {
      logger.error('Seed failed', error.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { seed };
