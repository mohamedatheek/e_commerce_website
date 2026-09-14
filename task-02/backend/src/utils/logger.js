function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info(message, extra) {
    console.log(`[${timestamp()}] INFO  ${message}`, extra || '');
  },
  warn(message, extra) {
    console.warn(`[${timestamp()}] WARN  ${message}`, extra || '');
  },
  error(message, extra) {
    console.error(`[${timestamp()}] ERROR ${message}`, extra || '');
  },
};

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

module.exports = { logger, requestLogger };
