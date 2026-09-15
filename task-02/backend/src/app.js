const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes');
const { corsOrigin } = require('./middleware/cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: corsOrigin,
    credentials: false,
  })
);
app.use(express.json({ limit: '32kb' }));
app.use(requestLogger);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
  })
);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Northline Checkout API', health: '/api/health' });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
