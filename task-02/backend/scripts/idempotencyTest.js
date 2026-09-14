/**
 * Duplicate payment test: two near-simultaneous SUCCESS payments for one
 * checkout session must produce one payment and one paid order.
 *
 * Usage:
 *   1. Set DATABASE_URL in backend/.env
 *   2. npm run migrate && npm run seed
 *   3. Start the API: npm run dev
 *   4. npm run test:idempotency
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';

async function main() {
  const checkoutRes = await fetch(`${API_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    }),
  });
  const checkoutBody = await checkoutRes.json();
  if (!checkoutRes.ok) {
    throw new Error(`Checkout failed: ${checkoutRes.status} ${checkoutBody.message}`);
  }

  const checkoutId = checkoutBody.data.id;
  console.log(`Checkout session: ${checkoutId}`);

  const payments = await Promise.all(
    [1, 2].map(() =>
      fetch(`${API_URL}/checkout/${checkoutId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'success' }),
      }).then(async (response) => ({ status: response.status, body: await response.json() }))
    )
  );

  payments.forEach((result, index) => {
    console.log(`Payment ${index + 1}: HTTP ${result.status} replayed=${result.body.data?.replayed} order=${result.body.data?.order?.id}`);
  });

  const ok = payments.filter((result) => result.status === 200);
  if (ok.length !== 2) {
    throw new Error('Both payment requests should return 200 after idempotent handling');
  }

  const orderIds = new Set(ok.map((result) => result.body.data.order.id));
  const paymentIds = new Set(ok.map((result) => result.body.data.payment.id));

  if (orderIds.size !== 1 || paymentIds.size !== 1) {
    console.error('FAIL: duplicate order or payment created');
    process.exit(1);
  }

  const replayedCount = ok.filter((result) => result.body.data.replayed).length;
  if (replayedCount < 1) {
    console.warn('Note: both requests may have serialized so tightly that replayed flags differ; IDs still match.');
  }

  console.log('PASS: only one payment and one order exist for the checkout session.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
