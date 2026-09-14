const { query } = require('../config/db');
const { SORT_OPTIONS } = require('../utils/constants');
const { AppError } = require('../utils/helpers');
const { mapProduct } = require('./inventoryService');
const { expireOldReservations } = require('./reservationService');

function buildProductFilters(queryParams) {
  const clauses = [];
  const values = [];

  const search = typeof queryParams.search === 'string' ? queryParams.search.trim() : '';
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
  }

  const category = typeof queryParams.category === 'string' ? queryParams.category.trim() : '';
  if (category && category.toLowerCase() !== 'all') {
    values.push(category);
    clauses.push(`p.category = $${values.length}`);
  }

  if (queryParams.minPrice !== undefined && queryParams.minPrice !== '') {
    const minPrice = Number(queryParams.minPrice);
    if (!Number.isFinite(minPrice) || minPrice < 0) {
      throw new AppError(400, 'minPrice must be a non-negative number');
    }
    values.push(minPrice);
    clauses.push(`p.price >= $${values.length}`);
  }

  if (queryParams.maxPrice !== undefined && queryParams.maxPrice !== '') {
    const maxPrice = Number(queryParams.maxPrice);
    if (!Number.isFinite(maxPrice) || maxPrice < 0) {
      throw new AppError(400, 'maxPrice must be a non-negative number');
    }
    values.push(maxPrice);
    clauses.push(`p.price <= $${values.length}`);
  }

  const inStock = queryParams.inStock;
  if (inStock === 'true' || inStock === true) {
    clauses.push('p.total_stock - p.reserved_stock > 0');
  }

  const sortKey = queryParams.sort || 'newest';
  const orderBy = SORT_OPTIONS[sortKey] || SORT_OPTIONS.newest;

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
    orderBy,
  };
}

async function listProducts(queryParams = {}) {
  await expireOldReservations();
  const { whereSql, values, orderBy } = buildProductFilters(queryParams);

  const result = await query(
    `
      SELECT id, name, description, category, price, image_url,
             total_stock, reserved_stock, created_at, updated_at
      FROM products p
      ${whereSql}
      ORDER BY ${orderBy}
    `,
    values
  );

  return result.rows.map(mapProduct);
}

async function getProductById(productId) {
  await expireOldReservations();
  const result = await query(
    `
      SELECT id, name, description, category, price, image_url,
             total_stock, reserved_stock, created_at, updated_at
      FROM products
      WHERE id = $1
    `,
    [productId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'Product not found');
  }

  return mapProduct(result.rows[0]);
}

async function listCategories() {
  const result = await query(
    `SELECT DISTINCT category FROM products ORDER BY category`
  );
  return result.rows.map((row) => row.category);
}

module.exports = {
  listProducts,
  getProductById,
  listCategories,
};
