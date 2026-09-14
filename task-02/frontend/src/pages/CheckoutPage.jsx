import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { fetchCheckout, payCheckout } from '../services/checkoutService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useCountdown } from '../hooks/useCountdown';
import { formatMoney } from '../utils/format';

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { push } = useToast();
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const countdown = useCountdown(checkout?.expiresAt);

  useEffect(() => {
    fetchCheckout(id)
      .then(setCheckout)
      .catch((error) => push(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, push]);

  async function handlePay(outcome) {
    if (paying) return;
    setPaying(true);
    try {
      const result = await payCheckout(id, outcome);
      if (outcome === 'success' && !result.replayed) {
        clearCart();
      }
      navigate('/payment-result', { state: { outcome, result, checkoutId: id } });
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <Loading label="Loading checkout…" />
      </section>
    );
  }

  if (!checkout) {
    return (
      <section className="page">
        <EmptyState title="Checkout not found" body="The reservation may have expired." />
      </section>
    );
  }

  const payable = checkout.status === 'ACTIVE' && !countdown.expired;

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Checkout</p>
        <h1>Reserved for Demo Customer</h1>
        <p className="muted">customer@example.com · stock is held until the timer reaches zero.</p>
      </div>

      <div className="split">
        <div className="card" style={{ padding: 20 }}>
          <div className="row space">
            <h2>Order summary</h2>
            <StatusBadge status={checkout.status} />
          </div>
          <div className="stack">
            {checkout.items.map((item) => (
              <div key={item.productId} className="row space">
                <div>
                  <strong>{item.productName}</strong>
                  <p className="muted">
                    {item.quantity} × {formatMoney(item.unitPrice)}
                  </p>
                </div>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="card stack" style={{ padding: 20 }}>
          <p>
            Reservation expires in <strong>{countdown.label}</strong>
          </p>
          <div className="row space">
            <span>Subtotal</span>
            <strong>{formatMoney(checkout.subtotal)}</strong>
          </div>
          <div className="row space">
            <span>Total</span>
            <strong>{formatMoney(checkout.total)}</strong>
          </div>
          <p className="muted">This is a mock payment gateway for assessment testing.</p>
          <button type="button" className="btn btn-success" disabled={!payable || paying} onClick={() => handlePay('success')}>
            Pay Successfully
          </button>
          <button type="button" className="btn btn-danger" disabled={!payable || paying} onClick={() => handlePay('failure')}>
            Simulate Failure
          </button>
          <button type="button" className="btn btn-warn" disabled={!payable || paying} onClick={() => handlePay('timeout')}>
            Simulate Timeout
          </button>
          {!payable && <p className="muted">This checkout is no longer payable.</p>}
        </aside>
      </div>
    </section>
  );
}
