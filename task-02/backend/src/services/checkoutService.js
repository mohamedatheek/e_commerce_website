const { env } = require('../config/env');
const { withTransaction, query } = require('../config/db');
const { CHECKOUT, ORDER, RESERVATION } = require('../utils/constants');
const { AppError, isUuid, toMoney, toInt } = require('../utils/helpers');
const { reserveUnits } = require('./inventoryService');
const { expireOldReservations, recordHistory } = require('./reservationService');

function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'Cart must contain at least one item');
  }

  const seen = new Set();
  const normalized = items.map((item) => {
    const productId = item.productId || item.product_id;
    const quantity = toInt(item.quantity, 0);

    if (!isUuid(productId)) {
      throw new AppError(400, 'Each cart item needs a valid productId');
    }
    if (quantity < 1 || quantity > 99) {
      throw new AppError(400, 'Quantity must be between 1 and 99');
    }
    if (seen.has(productId)) {
      throw new AppError(400, 'Duplicate product in cart');
    }
    seen.add(productId);
    return { productId, quantity };
  });

  return normalized;
}

async function createCheckout(rawItems) {
  await expireOldReservations();
  const items = validateCartItems(rawItems);
  const minutes = env.reservationMinutes;

  return withTransaction(async (client) => {
    const userResult = await client.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [env.demoUserId]
    );
    if (userResult.rowCount === 0) {
      throw new AppError(500, 'Demo user is not seeded');
    }

    const checkoutItems = [];
    let subtotal = 0;

    // Lock products in a stable order to reduce deadlock risk.
    const orderedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const item of orderedItems) {
      const product = await reserveUnits(client, item.productId, item.quantity);
      const unitPrice = toMoney(product.price);
      const lineTotal = toMoney(unitPrice * item.quantity);
      subtotal = toMoney(subtotal + lineTotal);
      checkoutItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const total = subtotal;

    const sessionResult = await client.query(
      `
        INSERT INTO checkout_sessions (user_id, status, expires_at, subtotal, total)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), $4, $5)
        RETURNING *
      `,
      [env.demoUserId, CHECKOUT.ACTIVE, minutes, subtotal, total]
    );
    const session = sessionResult.rows[0];

    for (const item of checkoutItems) {
      await client.query(
        `
          INSERT INTO checkout_items (
            checkout_session_id, product_id, product_name, quantity, unit_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [session.id, item.productId, item.productName, item.quantity, item.unitPrice, item.lineTotal]
      );

      await client.query(
        `
          INSERT INTO stock_reservations (
            checkout_session_id, product_id, quantity, status, expires_at
          ) VALUES ($1, $2, $3, $4, $5)
        `,
        [session.id, item.productId, item.quantity, RESERVATION.ACTIVE, session.expires_at]
      );
    }

    const orderResult = await client.query(
      `
        INSERT INTO orders (user_id, checkout_session_id, status, subtotal, total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [env.demoUserId, session.id, ORDER.PENDING, subtotal, total]
    );
    const order = orderResult.rows[0];

    for (const item of checkoutItems) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit_price, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [order.id, item.productId, item.productName, item.quantity, item.unitPrice, item.lineTotal]
      );
    }

    await recordHistory(client, order.id, null, ORDER.PENDING, 'Stock reserved for checkout');

    return mapCheckout(session, checkoutItems, order);
  });
}

async function getCheckout(checkoutId) {
  await expireOldReservations();

  const sessionResult = await query(
    `SELECT * FROM checkout_sessions WHERE id = $1`,
    [checkoutId]
  );
  if (sessionResult.rowCount === 0) {
    throw new AppError(404, 'Checkout session not found');
  }

  const itemsResult = await query(
    `
      SELECT product_id, product_name, quantity, unit_price, line_total
      FROM checkout_items
      WHERE checkout_session_id = $1
      ORDER BY product_name
    `,
    [checkoutId]
  );

  const orderResult = await query(
    `SELECT id, status FROM orders WHERE checkout_session_id = $1`,
    [checkoutId]
  );

  const items = itemsResult.rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  }));

  return mapCheckout(sessionResult.rows[0], items, orderResult.rows[0] || null);
}

function mapCheckout(session, items, order) {
  return {
    id: session.id,
    userId: session.user_id,
    status: session.status,
    expiresAt: session.expires_at,
    subtotal: Number(session.subtotal),
    total: Number(session.total),
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    reservationMinutes: env.reservationMinutes,
    items,
    order: order
      ? {
          id: order.id,
          status: order.status,
        }
      : null,
  };
}

module.exports = {
  createCheckout,
  getCheckout,
  validateCartItems,
};
