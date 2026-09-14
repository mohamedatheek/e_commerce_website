/**
 * Concurrency test: many simultaneous checkouts against a product with 2 units.
 * Successful reservations must never exceed available stock.
 *
 * Usage:
 *   1. Set DATABASE_URL in backend/.env
 *   2. npm run migrate && npm run seed
 *   3. Start the API in another terminal: npm run dev
 *   4. npm run test:concurrency
 *
 * The script resets only the Lab Stock Widget (fixed UUID) and does not
 * wipe customer orders or the rest of the catalog.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { CONCURRENCY_PRODUCT_ID } = require('../src/utils/constants');

const API_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const PRODUCT_ID = CONCURRENCY_PRODUCT_ID;
const PARALLEL_REQUESTS = Number(process.env.CONCURRENCY_REQUESTS || 8);
const STOCK = 2;

async function resetTestProduct() {
  const { pool } = require('../src/config/db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reservations = await client.query(
      `
        SELECT sr.id, sr.quantity, sr.status, sr.checkout_session_id
        FROM stock_reservations sr
        WHERE sr.product_id = $1 AND sr.status = 'ACTIVE'
        FOR UPDATE
      `,
      [PRODUCT_ID]
    );

    for (const row of reservations.rows) {
      await client.query(
        `UPDATE stock_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `
          UPDATE checkout_sessions
          SET status = 'FAILED', updated_at = NOW()
          WHERE id = $1 AND status IN ('ACTIVE', 'PAYMENT_PROCESSING')
        `,
        [row.checkout_session_id]
      );
      await client.query(
        `
          UPDATE orders
          SET status = 'CANCELLED', updated_at = NOW()
          WHERE checkout_session_id = $1 AND status = 'PENDING'
        `,
        [row.checkout_session_id]
      );
    }

    await client.query(
      `
        UPDATE products
        SET total_stock = $1, reserved_stock = 0, updated_at = NOW()
        WHERE id = $2
      `,
      [STOCK, PRODUCT_ID]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function checkoutOnce() {
  const response = await fetch(`${API_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    }),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function main() {
  console.log(`API: ${API_URL}`);
  console.log(`Resetting Lab Stock Widget to ${STOCK} available units...`);
  await resetTestProduct();

  console.log(`Sending ${PARALLEL_REQUESTS} simultaneous checkout requests...`);
  const results = await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, () => checkoutOnce()));

  const successes = results.filter((result) => result.status === 201);
  const conflicts = results.filter((result) => result.status === 409);
  const others = results.filter((result) => result.status !== 201 && result.status !== 409);

  console.log('--- Results ---');
  console.log(`Successful reservations: ${successes.length}`);
  console.log(`Stock conflicts (409):  ${conflicts.length}`);
  console.log(`Other responses:        ${others.length}`);
  others.forEach((result) => {
    console.log(`  ${result.status} ${result.body.message || JSON.stringify(result.body)}`);
  });

  if (successes.length > STOCK) {
    console.error('FAIL: overselling detected');
    process.exit(1);
  }
  if (successes.length !== STOCK) {
    console.error(`FAIL: expected exactly ${STOCK} successful reservations, got ${successes.length}`);
    process.exit(1);
  }

  console.log('PASS: successful reservations never exceeded available stock.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
