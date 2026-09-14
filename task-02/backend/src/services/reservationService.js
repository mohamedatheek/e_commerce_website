const { CHECKOUT, ORDER, RESERVATION } = require('../utils/constants');
const { logger } = require('../utils/logger');
const { assertCheckoutTransition, assertOrderTransition, assertReservationTransition } = require('./stateMachine');
const { releaseUnits } = require('./inventoryService');

async function recordHistory(client, orderId, fromStatus, toStatus, note) {
  await client.query(
    `
      INSERT INTO order_status_history (order_id, from_status, to_status, note)
      VALUES ($1, $2, $3, $4)
    `,
    [orderId, fromStatus, toStatus, note]
  );
}

async function expireSession(client, sessionId) {
  const sessionResult = await client.query(
    `
      SELECT id, status
      FROM checkout_sessions
      WHERE id = $1
      FOR UPDATE
    `,
    [sessionId]
  );

  if (sessionResult.rowCount === 0) {
    return false;
  }

  const session = sessionResult.rows[0];
  if (session.status === CHECKOUT.COMPLETED || session.status === CHECKOUT.EXPIRED || session.status === CHECKOUT.FAILED) {
    return false;
  }

  assertCheckoutTransition(session.status, CHECKOUT.EXPIRED);

  const reservations = await client.query(
    `
      SELECT id, product_id, quantity, status
      FROM stock_reservations
      WHERE checkout_session_id = $1
      FOR UPDATE
    `,
    [sessionId]
  );

  for (const reservation of reservations.rows) {
    if (reservation.status !== RESERVATION.ACTIVE) {
      continue;
    }
    assertReservationTransition(reservation.status, RESERVATION.EXPIRED);
    await lockProductQuiet(client, reservation.product_id);
    await releaseUnits(client, reservation.product_id, reservation.quantity);
    await client.query(
      `
        UPDATE stock_reservations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [RESERVATION.EXPIRED, reservation.id]
    );
  }

  await client.query(
    `
      UPDATE checkout_sessions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
    [CHECKOUT.EXPIRED, sessionId]
  );

  const orderResult = await client.query(
    `
      SELECT id, status
      FROM orders
      WHERE checkout_session_id = $1
      FOR UPDATE
    `,
    [sessionId]
  );

  if (orderResult.rowCount > 0) {
    const order = orderResult.rows[0];
    if (order.status === ORDER.PENDING) {
      assertOrderTransition(order.status, ORDER.EXPIRED);
      await client.query(
        `
          UPDATE orders
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [ORDER.EXPIRED, order.id]
      );
      await recordHistory(client, order.id, order.status, ORDER.EXPIRED, 'Checkout reservation expired');
    }
  }

  return true;
}

async function lockProductQuiet(client, productId) {
  await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [productId]);
}

/**
 * Database-backed expiry. Safe if Railway sleeps because correctness is
 * enforced whenever this runs before stock/payment operations, not by a timer.
 */
async function expireOldReservations(client) {
  const ownClient = !client;
  const db = client || (await require('../config/db').pool.connect());

  try {
    if (ownClient) {
      await db.query('BEGIN');
    }

    const expired = await db.query(
      `
        SELECT id
        FROM checkout_sessions
        WHERE status IN ($1, $2)
          AND expires_at <= NOW()
        FOR UPDATE SKIP LOCKED
      `,
      [CHECKOUT.ACTIVE, CHECKOUT.PAYMENT_PROCESSING]
    );

    let expiredCount = 0;
    for (const row of expired.rows) {
      const didExpire = await expireSession(db, row.id);
      if (didExpire) {
        expiredCount += 1;
      }
    }

    if (ownClient) {
      await db.query('COMMIT');
    }

    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} checkout session(s)`);
    }

    return expiredCount;
  } catch (error) {
    if (ownClient) {
      try {
        await db.query('ROLLBACK');
      } catch (_rollbackError) {
        // ignore
      }
    }
    throw error;
  } finally {
    if (ownClient) {
      db.release();
    }
  }
}

module.exports = {
  expireOldReservations,
  expireSession,
  recordHistory,
};
