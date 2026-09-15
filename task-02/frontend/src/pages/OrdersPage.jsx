import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { fetchOrders } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { formatDate, formatMoney } from '../utils/format';

export default function OrdersPage() {
  const { push } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders()
      .then((result) => setOrders(Array.isArray(result) ? result : []))
      .catch((err) => {
        setOrders([]);
        setError(err.message);
        push(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [push]);

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Demo customer</p>
        <h1>Order history</h1>
        <p className="muted">Orders belong to customer@example.com. Authentication can be added later.</p>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title="Could not load orders" body={error} />
      ) : !Array.isArray(orders) ? (
        <EmptyState title="Unable to load orders" body="The order list was not a valid array." />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Complete a checkout to see history here." />
      ) : (
        <div className="stack">
          {orders.map((order) => (
            <article key={order.id} className="card" style={{ padding: 18 }}>
              <div className="row space">
                <div>
                  <p className="muted">Order {order.id.slice(0, 8)}</p>
                  <strong>{formatDate(order.createdAt)}</strong>
                </div>
                <div className="row">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.paymentStatus} />
                </div>
              </div>
              <p>
                {(order.items || []).map((item) => `${item.productName} × ${item.quantity}`).join(', ')}
              </p>
              <div className="row space">
                <strong>{formatMoney(order.total)}</strong>
                <Link className="btn btn-ghost" to={`/orders/${order.id}`}>
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
