const express = require('express');
const { listOrders, getOrder, cancelOrder, refundOrder } = require('../controllers/orderController');
const { requireUuidParam } = require('../middleware/validate');

const router = express.Router();

router.get('/', listOrders);
router.get('/:id', requireUuidParam('id'), getOrder);
router.post('/:id/cancel', requireUuidParam('id'), cancelOrder);
router.post('/:id/refund', requireUuidParam('id'), refundOrder);

module.exports = router;
