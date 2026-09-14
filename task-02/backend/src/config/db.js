const { Pool } = require('pg');
const { env } = require('./env');

function getSslConfig(connectionString) {
  const url = connectionString || '';
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  if (isLocal) {
    return false;
  }
  // Neon and most hosted Postgres providers require SSL.
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: getSslConfig(env.databaseUrl),
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (error) => {
  console.error('[db] Unexpected pool error', error.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] Rollback failed', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  getSslConfig,
};
