const productService = require('../services/productService');
const { asyncHandler, success } = require('../utils/helpers');

const listProducts = asyncHandler(async (req, res) => {
  const products = await productService.listProducts(req.query);
  return success(res, products);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return success(res, product);
});

const listCategories = asyncHandler(async (_req, res) => {
  const categories = await productService.listCategories();
  return success(res, categories);
});

module.exports = {
  listProducts,
  getProduct,
  listCategories,
};
