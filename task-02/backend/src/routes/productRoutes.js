const express = require('express');
const { listProducts, getProduct, listCategories } = require('../controllers/productController');
const { requireUuidParam } = require('../middleware/validate');

const router = express.Router();

router.get('/', listProducts);
router.get('/categories', listCategories);
router.get('/:id', requireUuidParam('id'), getProduct);

module.exports = router;
