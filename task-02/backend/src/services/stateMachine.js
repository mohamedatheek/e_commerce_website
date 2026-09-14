const { CHECKOUT, ORDER, RESERVATION, PAYMENT } = require('../utils/constants');
const { AppError } = require('../utils/helpers');

const ORDER_TRANSITIONS = {
  [ORDER.PENDING]: [ORDER.PAID, ORDER.FAILED, ORDER.EXPIRED, ORDER.CANCELLED],
  [ORDER.PAID]: [ORDER.REFUNDED],
  [ORDER.CANCELLED]: [],
  [ORDER.REFUNDED]: [],
  [ORDER.FAILED]: [],
  [ORDER.EXPIRED]: [],
};

const CHECKOUT_TRANSITIONS = {
  [CHECKOUT.ACTIVE]: [CHECKOUT.PAYMENT_PROCESSING, CHECKOUT.EXPIRED, CHECKOUT.FAILED],
  [CHECKOUT.PAYMENT_PROCESSING]: [CHECKOUT.COMPLETED, CHECKOUT.FAILED, CHECKOUT.EXPIRED],
  [CHECKOUT.COMPLETED]: [],
  [CHECKOUT.EXPIRED]: [],
  [CHECKOUT.FAILED]: [],
};

const RESERVATION_TRANSITIONS = {
  [RESERVATION.ACTIVE]: [RESERVATION.CONSUMED, RESERVATION.RELEASED, RESERVATION.EXPIRED],
  [RESERVATION.CONSUMED]: [],
  [RESERVATION.RELEASED]: [],
  [RESERVATION.EXPIRED]: [],
};

const PAYMENT_TRANSITIONS = {
  [PAYMENT.PENDING]: [PAYMENT.SUCCESS, PAYMENT.FAILED, PAYMENT.TIMEOUT],
  [PAYMENT.SUCCESS]: [PAYMENT.REFUNDED],
  [PAYMENT.FAILED]: [],
  [PAYMENT.TIMEOUT]: [],
  [PAYMENT.REFUNDED]: [],
};

function assertTransition(machine, fromStatus, toStatus, entityName) {
  const allowed = machine[fromStatus];
  if (!allowed) {
    throw new AppError(409, `Unknown ${entityName} status: ${fromStatus}`);
  }
  if (!allowed.includes(toStatus)) {
    throw new AppError(
      409,
      `Invalid ${entityName} transition: ${fromStatus} -> ${toStatus}`
    );
  }
}

function assertOrderTransition(fromStatus, toStatus) {
  assertTransition(ORDER_TRANSITIONS, fromStatus, toStatus, 'order');
}

function assertCheckoutTransition(fromStatus, toStatus) {
  assertTransition(CHECKOUT_TRANSITIONS, fromStatus, toStatus, 'checkout');
}

function assertReservationTransition(fromStatus, toStatus) {
  assertTransition(RESERVATION_TRANSITIONS, fromStatus, toStatus, 'reservation');
}

function assertPaymentTransition(fromStatus, toStatus) {
  assertTransition(PAYMENT_TRANSITIONS, fromStatus, toStatus, 'payment');
}

function canPayCheckout(status) {
  return status === CHECKOUT.ACTIVE || status === CHECKOUT.PAYMENT_PROCESSING;
}

function canCancelOrder(status) {
  return status === ORDER.PENDING || status === ORDER.PAID;
}

function isTerminalCheckout(status) {
  return [CHECKOUT.COMPLETED, CHECKOUT.EXPIRED, CHECKOUT.FAILED].includes(status);
}

module.exports = {
  ORDER_TRANSITIONS,
  CHECKOUT_TRANSITIONS,
  RESERVATION_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  assertOrderTransition,
  assertCheckoutTransition,
  assertReservationTransition,
  assertPaymentTransition,
  canPayCheckout,
  canCancelOrder,
  isTerminalCheckout,
};
