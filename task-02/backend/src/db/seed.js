const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { logger } = require('../utils/logger');
const { migrate } = require('./migrate');
const { splitSqlStatements } = require('./sql');
const { describeConnection, tableCounts } = require('./inspect');

const seedsDir = path.resolve(__dirname, '../../seeds');

async function seed() {
  logger.info(`Seed directory: ${seedsDir}`);

  if (!fs.existsSync(seedsDir)) {
    throw new Error(`Seed directory does not exist: ${seedsDir}`);
  }

  const files = fs
    .readdirSync(seedsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  logger.info(`SQL seed files found: ${files.length}`);
  if (files.length === 0) {
    throw new Error(`No .sql seed files found in ${seedsDir}`);
  }

  await migrate();

  const client = await pool.connect();
  try {
    await describeConnection(client);
    await client.query('SET search_path TO public');

    const before = await tableCounts(client);
    logger.info(`Products before seed: ${before.products}`);
    logger.info(`Users before seed: ${before.users}`);

    await client.query('BEGIN');
    for (const filename of files) {
      const fullPath = path.join(seedsDir, filename);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const statements = splitSqlStatements(sql);
      logger.info(`Executing: ${filename} (${statements.length} statements)`);
      if (statements.length === 0) {
        throw new Error(`Seed file ${filename} produced zero SQL statements`);
      }
      for (const statement of statements) {
        const result = await client.query(statement);
        logger.info(`  rows affected: ${result.rowCount ?? 0}`);
      }
    }
    await client.query('COMMIT');
    logger.info('Seed committed successfully.');

    const after = await tableCounts(client);
    logger.info(`Products after seed: ${after.products}`);
    logger.info(`Users after seed: ${after.users}`);

    if (after.products < 1) {
      throw new Error('Seed completed without inserting products');
    }
    if (after.users < 1) {
      throw new Error('Seed completed without inserting the demo user');
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackError) {
      // ignore
    }
    logger.error('Seed failed', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(async () => {
      logger.info('Seed completed successfully.');
      await pool.end();
    })
    .catch(async (error) => {
      logger.error('Seed failed', error.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { seed };
