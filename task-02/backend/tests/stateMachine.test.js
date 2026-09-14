const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertOrderTransition,
  assertCheckoutTransition,
  assertPaymentTransition,
  canPayCheckout,
  canCancelOrder,
} = require('../src/services/stateMachine');
const { AppError } = require('../src/utils/helpers');

describe('order state machine', () => {
  it('allows reserved pending orders to become paid', () => {
    assert.doesNotThrow(() => assertOrderTransition('PENDING', 'PAID'));
  });

  it('rejects refunded orders becoming paid', () => {
    assert.throws(() => assertOrderTransition('REFUNDED', 'PAID'), AppError);
  });

  it('rejects cancelled orders becoming paid', () => {
    assert.throws(() => assertOrderTransition('CANCELLED', 'PAID'), AppError);
  });

  it('allows paid orders to be refunded', () => {
    assert.doesNotThrow(() => assertOrderTransition('PAID', 'REFUNDED'));
  });
});

describe('checkout state machine', () => {
  it('does not allow expired checkouts to complete', () => {
    assert.throws(() => assertCheckoutTransition('EXPIRED', 'COMPLETED'), AppError);
  });

  it('identifies payable checkout statuses', () => {
    assert.equal(canPayCheckout('ACTIVE'), true);
    assert.equal(canPayCheckout('EXPIRED'), false);
    assert.equal(canPayCheckout('COMPLETED'), false);
  });
});

describe('payment state machine', () => {
  it('allows a successful payment to be refunded once', () => {
    assert.doesNotThrow(() => assertPaymentTransition('SUCCESS', 'REFUNDED'));
    assert.throws(() => assertPaymentTransition('REFUNDED', 'SUCCESS'), AppError);
  });
});

describe('cancellation rules', () => {
  it('allows pending and paid orders to cancel', () => {
    assert.equal(canCancelOrder('PENDING'), true);
    assert.equal(canCancelOrder('PAID'), true);
    assert.equal(canCancelOrder('EXPIRED'), false);
    assert.equal(canCancelOrder('REFUNDED'), false);
  });
});
