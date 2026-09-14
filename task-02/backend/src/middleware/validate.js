const { AppError, isUuid } = require('../utils/helpers');

function requireUuidParam(paramName) {
  return (req, _res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return next(new AppError(400, `Invalid ${paramName}`));
    }
    return next();
  };
}

module.exports = { requireUuidParam };
