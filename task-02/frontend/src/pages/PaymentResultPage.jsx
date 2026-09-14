import { Link, useLocation } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../utils/format';

const COPY = {
  success: {
    title: 'Payment successful',
    body: 'The reservation was consumed, stock was permanently reduced, and the order is marked paid.',
  },
  failure: {
    title: 'Payment failed',
    body: 'The mock gateway declined the charge. Reserved stock was released and is available again.',
  },
  timeout: {
    title: 'Payment timed out',
    body: 'The checkout expired. Reserved stock was released and the order is no longer payable.',
  },
};

export default function PaymentResultPage() {
  const location = useLocation();
  const outcome = location.state?.outcome || 'success';
  const result = location.state?.result;
  const copy = COPY[outcome] || COPY.success;

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Mock payment gateway</p>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.body}</p>
      </div>

      <div className="card stack" style={{ padding: 24 }}>
        {result ? (
          <>
            <div className="row space">
              <span>Checkout</span>
              <StatusBadge status={result.checkoutStatus} />
            </div>
            <div className="row space">
              <span>Order</span>
              <StatusBadge status={result.order?.status} />
            </div>
            <div className="row space">
              <span>Payment</span>
              <StatusBadge status={result.payment?.status} />
            </div>
            <div className="row space">
              <span>Amount</span>
              <strong>{formatMoney(result.order?.total || result.payment?.amount)}</strong>
            </div>
            {result.replayed && <p className="muted">This response was idempotent. No second charge was created.</p>}
            {result.order?.id && (
              <Link className="btn btn-primary" to={`/orders/${result.order.id}`}>
                View order
              </Link>
            )}
          </>
        ) : (
          <p className="muted">No payment result was provided. Open this page from checkout.</p>
        )}
        <Link className="btn btn-ghost" to="/">
          Back to products
        </Link>
      </div>
    </section>
  );
}
