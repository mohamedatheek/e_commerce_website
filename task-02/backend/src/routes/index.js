const express = require('express');
const healthRoutes = require('./healthRoutes');
const productRoutes = require('./productRoutes');
const checkoutRoutes = require('./checkoutRoutes');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
