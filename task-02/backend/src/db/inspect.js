const { env } = require('../config/env');
const { logger } = require('../utils/logger');

async function describeConnection(client) {
  const result = await client.query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS db_user,
      inet_server_port() AS server_port,
      version() AS server_version
  `);
  const info = result.rows[0];
  const version = String(info.server_version || '').split(',')[0];

  logger.info('Connecting to database...');
  logger.info(`Database: ${info.database_name}`);
  logger.info(`Schema: ${info.schema_name}`);
  logger.info(`Uses Neon hostname: ${env.usesNeon ? 'yes' : 'no'}`);
  logger.info(`Server: ${version}`);

  return {
    database: info.database_name,
    schema: info.schema_name,
  };
}

async function tableCounts(client) {
  const products = await client.query('SELECT COUNT(*)::int AS count FROM products');
  const users = await client.query('SELECT COUNT(*)::int AS count FROM users');
  return {
    products: products.rows[0].count,
    users: users.rows[0].count,
  };
}

module.exports = { describeConnection, tableCounts };
