import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QuantitySelector from '../components/QuantitySelector';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { fetchProduct } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import { formatMoney } from '../utils/format';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { push } = useToast();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProduct(id)
      .then((data) => {
        setProduct(data);
        setQuantity(data.availableStock > 0 ? 1 : 0);
      })
      .catch((error) => push(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, push]);

  if (loading) {
    return (
      <section className="page">
        <Loading />
      </section>
    );
  }

  if (!product) {
    return (
      <section className="page">
        <EmptyState title="Product not found" body="It may have been removed from the catalog." />
      </section>
    );
  }

  const max = Math.max(0, product.availableStock);

  function handleAdd() {
    try {
      addItem(product, quantity);
      push(`${product.name} added to cart`, 'success');
    } catch (error) {
      push(error.message, 'error');
    }
  }

  return (
    <section className="page">
      <div className="card detail-layout">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', minHeight: 320, objectFit: 'cover' }}
        />
        <div className="stack" style={{ padding: 28 }}>
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <h2>{formatMoney(product.price)}</h2>
          <p>
            Available stock: <strong>{product.availableStock}</strong>
          </p>
          <QuantitySelector value={quantity} min={1} max={Math.max(1, max)} onChange={setQuantity} />
          <button type="button" className="btn btn-primary" disabled={max <= 0} onClick={handleAdd}>
            {max <= 0 ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </section>
  );
}
