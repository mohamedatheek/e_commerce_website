const { asyncHandler } = require('../utils/helpers');
const { query } = require('../config/db');

const getHealth = asyncHandler(async (_req, res) => {
  await query('SELECT 1');
  return res.status(200).json({ status: 'ok' });
});

module.exports = { getHealth };
