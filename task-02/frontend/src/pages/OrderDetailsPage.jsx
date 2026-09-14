import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { cancelOrder, fetchOrder } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { formatDate, formatMoney } from '../utils/format';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { push } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOrder(await fetchOrder(id));
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    const confirmed = window.confirm(
      order.status === 'PAID'
        ? 'Cancel this paid order and simulate a refund? Stock will be restored once.'
        : 'Cancel this reserved order and release stock?'
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await cancelOrder(id);
      push('Order updated', 'success');
      await load();
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <Loading />
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page">
        <EmptyState title="Order not found" body="Check the order id or return to history." />
      </section>
    );
  }

  const canCancel = order.status === 'PENDING' || order.status === 'PAID';

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Order {order.id}</p>
        <h1>{formatMoney(order.total)}</h1>
        <div className="row">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment?.status} />
          <span className="muted">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="split">
        <div className="card stack" style={{ padding: 20 }}>
          <h2>Items</h2>
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.productName}`} className="row space">
              <div>
                <strong>{item.productName}</strong>
                <p className="muted">
                  Qty {item.quantity} · {formatMoney(item.unitPrice)} snapshot price
                </p>
              </div>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
          {canCancel && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={handleCancel}>
              {order.status === 'PAID' ? 'Cancel & refund' : 'Cancel reservation'}
            </button>
          )}
        </div>

        <aside className="card stack" style={{ padding: 20 }}>
          <h2>Status history</h2>
          <div className="timeline">
            {order.history.map((entry, index) => (
              <article key={`${entry.createdAt}-${index}`}>
                <StatusBadge status={entry.toStatus} />
                <p>{entry.note}</p>
                <p className="muted">{formatDate(entry.createdAt)}</p>
              </article>
            ))}
          </div>
          {order.refund && (
            <p>
              Refund {formatMoney(order.refund.amount)} · <StatusBadge status={order.refund.status} />
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
