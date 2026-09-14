class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function fail(res, message, statusCode = 400, details = null) {
  const payload = { success: false, message };
  if (details) {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
}

function isUuid(value) {
  const { UUID_REGEX } = require('./constants');
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  AppError,
  asyncHandler,
  success,
  fail,
  isUuid,
  toMoney,
  toInt,
};
