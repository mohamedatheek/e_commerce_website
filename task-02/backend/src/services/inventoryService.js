const { AppError } = require('../utils/helpers');

function mapProduct(row) {
  const totalStock = Number(row.total_stock);
  const reservedStock = Number(row.reserved_stock);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.image_url,
    totalStock,
    reservedStock,
    availableStock: totalStock - reservedStock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function lockProduct(client, productId) {
  const result = await client.query(
    `
      SELECT id, name, description, category, price, image_url,
             total_stock, reserved_stock, created_at, updated_at
      FROM products
      WHERE id = $1
      FOR UPDATE
    `,
    [productId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'Product not found');
  }

  return mapProduct(result.rows[0]);
}

async function reserveUnits(client, productId, quantity) {
  const product = await lockProduct(client, productId);

  if (product.availableStock < quantity) {
    throw new AppError(
      409,
      `Insufficient stock for ${product.name}. Available: ${product.availableStock}, requested: ${quantity}`
    );
  }

  const updated = await client.query(
    `
      UPDATE products
      SET reserved_stock = reserved_stock + $1,
          updated_at = NOW()
      WHERE id = $2
        AND total_stock - reserved_stock >= $1
      RETURNING id
    `,
    [quantity, productId]
  );

  if (updated.rowCount === 0) {
    throw new AppError(409, `Insufficient stock for ${product.name}`);
  }

  return product;
}

async function releaseUnits(client, productId, quantity) {
  const updated = await client.query(
    `
      UPDATE products
      SET reserved_stock = GREATEST(reserved_stock - $1, 0),
          updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [quantity, productId]
  );

  if (updated.rowCount === 0) {
    throw new AppError(404, 'Product not found while releasing stock');
  }
}

async function consumeUnits(client, productId, quantity) {
  const updated = await client.query(
    `
      UPDATE products
      SET reserved_stock = reserved_stock - $1,
          total_stock = total_stock - $1,
          updated_at = NOW()
      WHERE id = $2
        AND reserved_stock >= $1
        AND total_stock >= $1
      RETURNING id
    `,
    [quantity, productId]
  );

  if (updated.rowCount === 0) {
    throw new AppError(409, 'Unable to consume reserved stock');
  }
}

async function restoreSoldUnits(client, productId, quantity) {
  const updated = await client.query(
    `
      UPDATE products
      SET total_stock = total_stock + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [quantity, productId]
  );

  if (updated.rowCount === 0) {
    throw new AppError(404, 'Product not found while restoring stock');
  }
}

module.exports = {
  mapProduct,
  lockProduct,
  reserveUnits,
  releaseUnits,
  consumeUnits,
  restoreSoldUnits,
};
