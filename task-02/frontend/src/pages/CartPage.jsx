import { useNavigate } from 'react-router-dom';
import QuantitySelector from '../components/QuantitySelector';
import EmptyState from '../components/EmptyState';
import ProductImage from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { createCheckout } from '../services/checkoutService';
import { formatMoney } from '../utils/format';
import { useState } from 'react';

export default function CartPage() {
  const { items, setQuantity, removeItem, clearCart, subtotal } = useCart();
  const { push } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleCheckout() {
    setBusy(true);
    try {
      const checkout = await createCheckout(items);
      if (!checkout?.id) {
        throw new Error('Checkout session was not created');
      }
      navigate(`/checkout/${checkout.id}`);
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <section className="page">
        <div className="hero">
          <p className="eyebrow">Cart</p>
          <h1>Your bag is empty</h1>
        </div>
        <EmptyState title="No items yet" body="Add a product from the catalog to start checkout." />
      </section>
    );
  }

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Cart</p>
        <h1>Review items before reserving stock</h1>
      </div>

      <div className="stack">
        {(Array.isArray(items) ? items : []).map((item) => (
          <article key={item.productId} className="card cart-line">
            <ProductImage src={item.imageUrl} alt={item.name} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 12 }} />
            <div>
              <h3>{item.name}</h3>
              <p className="muted">{formatMoney(item.price)} each</p>
              <QuantitySelector
                value={item.quantity}
                max={item.availableStock || item.quantity}
                onChange={(value) => setQuantity(item.productId, value)}
              />
            </div>
            <div className="stack" style={{ justifyItems: 'end' }}>
              <strong>{formatMoney(item.price * item.quantity)}</strong>
              <button type="button" className="btn btn-danger" onClick={() => removeItem(item.productId)}>
                Remove
              </button>
            </div>
          </article>
        ))}

        <div className="card" style={{ padding: 20 }}>
          <div className="row space">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="row space">
            <span>Total</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={clearCart}>
              Clear cart
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleCheckout}>
              {busy ? 'Reserving stock…' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
