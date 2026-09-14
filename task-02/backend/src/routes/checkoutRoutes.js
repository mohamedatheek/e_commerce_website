const express = require('express');
const rateLimit = require('express-rate-limit');
const { createCheckout, getCheckout, payCheckout } = require('../controllers/checkoutController');
const { requireUuidParam } = require('../middleware/validate');

const router = express.Router();

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many checkout requests' },
});

router.post('/', checkoutLimiter, createCheckout);
router.get('/:id', requireUuidParam('id'), getCheckout);
router.post('/:id/payment', checkoutLimiter, requireUuidParam('id'), payCheckout);

module.exports = router;
