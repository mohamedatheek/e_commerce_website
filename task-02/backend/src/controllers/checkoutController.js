const checkoutService = require('../services/checkoutService');
const paymentService = require('../services/paymentService');
const { asyncHandler, success } = require('../utils/helpers');

const createCheckout = asyncHandler(async (req, res) => {
  const checkout = await checkoutService.createCheckout(req.body?.items);
  return success(res, checkout, 201);
});

const getCheckout = asyncHandler(async (req, res) => {
  const checkout = await checkoutService.getCheckout(req.params.id);
  return success(res, checkout);
});

const payCheckout = asyncHandler(async (req, res) => {
  const result = await paymentService.processPayment(req.params.id, req.body?.outcome);
  return success(res, result);
});

module.exports = {
  createCheckout,
  getCheckout,
  payCheckout,
};
