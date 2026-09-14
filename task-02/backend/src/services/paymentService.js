const { withTransaction } = require('../config/db');
const { CHECKOUT, ORDER, PAYMENT, RESERVATION } = require('../utils/constants');
const { AppError, toMoney } = require('../utils/helpers');
const { consumeUnits, releaseUnits } = require('./inventoryService');
const { expireOldReservations, expireSession, recordHistory } = require('./reservationService');
const {
  assertCheckoutTransition,
  assertOrderTransition,
  assertReservationTransition,
  canPayCheckout,
} = require('./stateMachine');

function normalizeOutcome(outcome) {
  const value = String(outcome || '').trim().toLowerCase();
  if (value === 'success' || value === 'failure' || value === 'timeout') {
    return value;
  }
  throw new AppError(400, 'outcome must be success, failure, or timeout');
}

function paymentStatusForOutcome(outcome) {
  if (outcome === 'success') return PAYMENT.SUCCESS;
  if (outcome === 'failure') return PAYMENT.FAILED;
  return PAYMENT.TIMEOUT;
}

async function processPayment(checkoutId, rawOutcome) {
  await expireOldReservations();
  const outcome = normalizeOutcome(rawOutcome);

  const result = await withTransaction(async (client) => {
    const sessionResult = await client.query(
      `
        SELECT *
        FROM checkout_sessions
        WHERE id = $1
        FOR UPDATE
      `,
      [checkoutId]
    );

    if (sessionResult.rowCount === 0) {
      throw new AppError(404, 'Checkout session not found');
    }

    const session = sessionResult.rows[0];

    if (session.status === CHECKOUT.COMPLETED) {
      return loadExistingSuccess(client, checkoutId, true);
    }

    if (new Date(session.expires_at).getTime() <= Date.now() && canPayCheckout(session.status)) {
      await expireSession(client, checkoutId);
      return { expiredNow: true };
    }

    if (!canPayCheckout(session.status)) {
      throw new AppError(409, `Checkout is not payable from status ${session.status}`);
    }

    const existingPayment = await client.query(
      `
        SELECT *
        FROM payments
        WHERE checkout_session_id = $1
        FOR UPDATE
      `,
      [checkoutId]
    );

    if (existingPayment.rowCount > 0) {
      if (existingPayment.rows[0].status === PAYMENT.SUCCESS) {
        return loadExistingSuccess(client, checkoutId, true);
      }
      throw new AppError(409, 'This checkout already has a payment attempt');
    }

    const orderResult = await client.query(
      `
        SELECT *
        FROM orders
        WHERE checkout_session_id = $1
        FOR UPDATE
      `,
      [checkoutId]
    );

    if (orderResult.rowCount === 0) {
      throw new AppError(409, 'Checkout is missing an order');
    }

    const order = orderResult.rows[0];
    if (order.status !== ORDER.PENDING) {
      throw new AppError(409, `Order cannot be paid from status ${order.status}`);
    }

    if (session.status === CHECKOUT.ACTIVE) {
      assertCheckoutTransition(session.status, CHECKOUT.PAYMENT_PROCESSING);
      await client.query(
        `
          UPDATE checkout_sessions
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [CHECKOUT.PAYMENT_PROCESSING, checkoutId]
      );
      session.status = CHECKOUT.PAYMENT_PROCESSING;
    }

    const reservations = await client.query(
      `
        SELECT *
        FROM stock_reservations
        WHERE checkout_session_id = $1
        ORDER BY product_id
        FOR UPDATE
      `,
      [checkoutId]
    );

    const paymentInsert = await client.query(
      `
        INSERT INTO payments (order_id, checkout_session_id, amount, status, outcome)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [order.id, checkoutId, toMoney(session.total), paymentStatusForOutcome(outcome), outcome]
    );
    const payment = paymentInsert.rows[0];

    if (outcome === 'success') {
      return finalizeSuccess(client, session, order, reservations.rows, payment);
    }
    if (outcome === 'failure') {
      return finalizeFailure(client, session, order, reservations.rows, payment);
    }
    return finalizeTimeout(client, session, order, reservations.rows, payment);
  });

  if (result.expiredNow) {
    throw new AppError(409, 'Checkout reservation has expired and is no longer payable');
  }

  return result;
}

async function finalizeSuccess(client, session, order, reservations, payment) {
  assertCheckoutTransition(CHECKOUT.PAYMENT_PROCESSING, CHECKOUT.COMPLETED);
  assertOrderTransition(order.status, ORDER.PAID);

  for (const reservation of reservations) {
    if (reservation.status !== RESERVATION.ACTIVE) {
      throw new AppError(409, 'Reservation is no longer active');
    }
    assertReservationTransition(reservation.status, RESERVATION.CONSUMED);
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [reservation.product_id]);
    await consumeUnits(client, reservation.product_id, reservation.quantity);
    await client.query(
      `
        UPDATE stock_reservations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [RESERVATION.CONSUMED, reservation.id]
    );
  }

  await client.query(
    `
      UPDATE checkout_sessions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [CHECKOUT.COMPLETED, session.id]
  );

  await client.query(
    `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [ORDER.PAID, order.id]
  );

  await recordHistory(client, order.id, order.status, ORDER.PAID, 'Payment successful');

  return {
    replayed: false,
    checkoutStatus: CHECKOUT.COMPLETED,
    order: { id: order.id, status: ORDER.PAID, total: Number(order.total) },
    payment: mapPayment(payment),
  };
}

async function finalizeFailure(client, session, order, reservations, payment) {
  assertCheckoutTransition(CHECKOUT.PAYMENT_PROCESSING, CHECKOUT.FAILED);
  assertOrderTransition(order.status, ORDER.FAILED);

  await releaseActiveReservations(client, reservations, RESERVATION.RELEASED);

  await client.query(
    `
      UPDATE checkout_sessions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [CHECKOUT.FAILED, session.id]
  );

  await client.query(
    `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [ORDER.FAILED, order.id]
  );

  await recordHistory(client, order.id, order.status, ORDER.FAILED, 'Payment failed; reserved stock released');

  return {
    replayed: false,
    checkoutStatus: CHECKOUT.FAILED,
    order: { id: order.id, status: ORDER.FAILED, total: Number(order.total) },
    payment: mapPayment(payment),
  };
}

async function finalizeTimeout(client, session, order, reservations, payment) {
  await expireSession(client, session.id);

  const refreshedOrder = await client.query('SELECT status FROM orders WHERE id = $1', [order.id]);

  return {
    replayed: false,
    checkoutStatus: CHECKOUT.EXPIRED,
    order: {
      id: order.id,
      status: refreshedOrder.rows[0]?.status || ORDER.EXPIRED,
      total: Number(order.total),
    },
    payment: mapPayment(payment),
  };
}

async function releaseActiveReservations(client, reservations, nextStatus) {
  for (const reservation of reservations) {
    if (reservation.status !== RESERVATION.ACTIVE) {
      continue;
    }
    assertReservationTransition(reservation.status, nextStatus);
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [reservation.product_id]);
    await releaseUnits(client, reservation.product_id, reservation.quantity);
    await client.query(
      `
        UPDATE stock_reservations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [nextStatus, reservation.id]
    );
  }
}

async function loadExistingSuccess(client, checkoutId, replayed) {
  const payment = await client.query(
    `SELECT * FROM payments WHERE checkout_session_id = $1`,
    [checkoutId]
  );
  const order = await client.query(
    `SELECT * FROM orders WHERE checkout_session_id = $1`,
    [checkoutId]
  );

  return {
    replayed,
    checkoutStatus: CHECKOUT.COMPLETED,
    order: order.rows[0]
      ? { id: order.rows[0].id, status: order.rows[0].status, total: Number(order.rows[0].total) }
      : null,
    payment: payment.rows[0] ? mapPayment(payment.rows[0]) : null,
  };
}

function mapPayment(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    checkoutSessionId: row.checkout_session_id,
    amount: Number(row.amount),
    status: row.status,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

module.exports = {
  processPayment,
};
