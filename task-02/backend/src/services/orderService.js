const { env } = require('../config/env');
const { query, withTransaction } = require('../config/db');
const { ORDER, PAYMENT, REFUND, CHECKOUT, RESERVATION } = require('../utils/constants');
const { AppError, toMoney } = require('../utils/helpers');
const { restoreSoldUnits, releaseUnits } = require('./inventoryService');
const { expireOldReservations, recordHistory } = require('./reservationService');
const {
  assertOrderTransition,
  assertPaymentTransition,
  assertReservationTransition,
  assertCheckoutTransition,
  canCancelOrder,
} = require('./stateMachine');

async function listOrders() {
  await expireOldReservations();

  const result = await query(
    `
      SELECT o.*, p.status AS payment_status
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `,
    [env.demoUserId]
  );

  const orders = [];
  for (const row of result.rows) {
    const items = await query(
      `
        SELECT product_id, product_name, quantity, unit_price, line_total
        FROM order_items
        WHERE order_id = $1
        ORDER BY product_name
      `,
      [row.id]
    );
    orders.push(mapOrderSummary(row, items.rows));
  }
  return orders;
}

async function getOrderById(orderId) {
  await expireOldReservations();

  const result = await query(
    `
      SELECT o.*, p.id AS payment_id, p.status AS payment_status, p.amount AS payment_amount,
             p.outcome AS payment_outcome, p.created_at AS payment_created_at,
             o.checkout_session_id
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
    `,
    [orderId, env.demoUserId]
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'Order not found');
  }

  const items = await query(
    `
      SELECT product_id, product_name, quantity, unit_price, line_total
      FROM order_items
      WHERE order_id = $1
      ORDER BY product_name
    `,
    [orderId]
  );

  const history = await query(
    `
      SELECT from_status, to_status, note, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC
    `,
    [orderId]
  );

  const refund = await query(
    `
      SELECT id, amount, status, created_at
      FROM refunds
      WHERE order_id = $1
    `,
    [orderId]
  );

  return mapOrderDetails(result.rows[0], items.rows, history.rows, refund.rows[0] || null);
}

async function cancelOrder(orderId) {
  await expireOldReservations();

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `
        SELECT *
        FROM orders
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [orderId, env.demoUserId]
    );

    if (orderResult.rowCount === 0) {
      throw new AppError(404, 'Order not found');
    }

    const order = orderResult.rows[0];

    if (order.status === ORDER.CANCELLED || order.status === ORDER.REFUNDED) {
      throw new AppError(409, 'Order has already been cancelled or refunded');
    }

    if (!canCancelOrder(order.status)) {
      throw new AppError(409, `Order cannot be cancelled from status ${order.status}`);
    }

    if (order.status === ORDER.PENDING) {
      return cancelUnpaidOrder(client, order);
    }

    return refundPaidOrder(client, order);
  });
}

async function refundOrder(orderId) {
  await expireOldReservations();

  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `
        SELECT *
        FROM orders
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [orderId, env.demoUserId]
    );

    if (orderResult.rowCount === 0) {
      throw new AppError(404, 'Order not found');
    }

    const order = orderResult.rows[0];
    if (order.status === ORDER.REFUNDED) {
      throw new AppError(409, 'Order has already been refunded');
    }
    if (order.status !== ORDER.PAID) {
      throw new AppError(409, 'Only paid orders can be refunded');
    }

    return refundPaidOrder(client, order);
  });
}

async function cancelUnpaidOrder(client, order) {
  assertOrderTransition(order.status, ORDER.CANCELLED);

  const sessionResult = await client.query(
    `
      SELECT * FROM checkout_sessions WHERE id = $1 FOR UPDATE
    `,
    [order.checkout_session_id]
  );
  const session = sessionResult.rows[0];

  if (session && (session.status === CHECKOUT.ACTIVE || session.status === CHECKOUT.PAYMENT_PROCESSING)) {
    assertCheckoutTransition(session.status, CHECKOUT.FAILED);
    await client.query(
      `
        UPDATE checkout_sessions
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [CHECKOUT.FAILED, session.id]
    );
  }

  const reservations = await client.query(
    `
      SELECT * FROM stock_reservations
      WHERE checkout_session_id = $1
      FOR UPDATE
    `,
    [order.checkout_session_id]
  );

  for (const reservation of reservations.rows) {
    if (reservation.status !== RESERVATION.ACTIVE) {
      continue;
    }
    assertReservationTransition(reservation.status, RESERVATION.RELEASED);
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [reservation.product_id]);
    await releaseUnits(client, reservation.product_id, reservation.quantity);
    await client.query(
      `
        UPDATE stock_reservations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [RESERVATION.RELEASED, reservation.id]
    );
  }

  await client.query(
    `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [ORDER.CANCELLED, order.id]
  );
  await recordHistory(client, order.id, order.status, ORDER.CANCELLED, 'Unpaid order cancelled; stock released');

  return {
    id: order.id,
    status: ORDER.CANCELLED,
    refund: null,
  };
}

async function refundPaidOrder(client, order) {
  assertOrderTransition(order.status, ORDER.REFUNDED);

  const paymentResult = await client.query(
    `
      SELECT * FROM payments
      WHERE order_id = $1
      FOR UPDATE
    `,
    [order.id]
  );

  if (paymentResult.rowCount === 0 || paymentResult.rows[0].status !== PAYMENT.SUCCESS) {
    throw new AppError(409, 'Paid order is missing a successful payment');
  }

  const payment = paymentResult.rows[0];
  assertPaymentTransition(payment.status, PAYMENT.REFUNDED);

  const existingRefund = await client.query(
    `
      SELECT * FROM refunds WHERE order_id = $1 FOR UPDATE
    `,
    [order.id]
  );
  if (existingRefund.rowCount > 0) {
    throw new AppError(409, 'A refund already exists for this order');
  }

  const refundAmount = toMoney(payment.amount);
  if (refundAmount !== toMoney(order.total)) {
    throw new AppError(409, 'Refund amount must match the paid amount');
  }

  const items = await client.query(
    `
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = $1
    `,
    [order.id]
  );

  for (const item of items.rows) {
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
    await restoreSoldUnits(client, item.product_id, item.quantity);
  }

  await client.query(
    `
      UPDATE payments
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [PAYMENT.REFUNDED, payment.id]
  );

  const refundInsert = await client.query(
    `
      INSERT INTO refunds (order_id, payment_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [order.id, payment.id, refundAmount, REFUND.SUCCESS]
  );

  await client.query(
    `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [ORDER.REFUNDED, order.id]
  );

  await recordHistory(
    client,
    order.id,
    order.status,
    ORDER.REFUNDED,
    'Paid order cancelled with mock refund; inventory restored once'
  );

  return {
    id: order.id,
    status: ORDER.REFUNDED,
    refund: {
      id: refundInsert.rows[0].id,
      amount: Number(refundInsert.rows[0].amount),
      status: refundInsert.rows[0].status,
    },
  };
}

function mapOrderSummary(row, items) {
  return {
    id: row.id,
    status: row.status,
    paymentStatus: row.payment_status || null,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map(mapItem),
  };
}

function mapOrderDetails(row, items, history, refund) {
  return {
    ...mapOrderSummary(row, items),
    checkoutSessionId: row.checkout_session_id,
    payment: row.payment_id
      ? {
          id: row.payment_id,
          status: row.payment_status,
          amount: Number(row.payment_amount),
          outcome: row.payment_outcome,
          createdAt: row.payment_created_at,
        }
      : null,
    refund: refund
      ? {
          id: refund.id,
          amount: Number(refund.amount),
          status: refund.status,
          createdAt: refund.created_at,
        }
      : null,
    history: history.map((entry) => ({
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
      note: entry.note,
      createdAt: entry.created_at,
    })),
  };
}

function mapItem(row) {
  return {
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  };
}

module.exports = {
  listOrders,
  getOrderById,
  cancelOrder,
  refundOrder,
};
