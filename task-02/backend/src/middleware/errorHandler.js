const { AppError } = require('../utils/helpers');
const { logger } = require('../utils/logger');

function notFound(_req, _res, next) {
  next(new AppError(404, 'Route not found'));
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate request rejected by database constraint',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Related record was not found',
    });
  }

  if (err.code === '23514') {
    return res.status(409).json({
      success: false,
      message: 'Database check constraint failed',
    });
  }

  logger.error('Unhandled error', err.stack || err.message);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
