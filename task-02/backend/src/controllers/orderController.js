const orderService = require('../services/orderService');
const { asyncHandler, success } = require('../utils/helpers');

const listOrders = asyncHandler(async (_req, res) => {
  const orders = await orderService.listOrders();
  return success(res, orders);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  return success(res, order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const result = await orderService.cancelOrder(req.params.id);
  return success(res, result);
});

const refundOrder = asyncHandler(async (req, res) => {
  const result = await orderService.refundOrder(req.params.id);
  return success(res, result);
});

module.exports = {
  listOrders,
  getOrder,
  cancelOrder,
  refundOrder,
};
