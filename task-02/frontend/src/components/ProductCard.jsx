import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/format';
import ProductImage from './ProductImage';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onAdd }) {
  const outOfStock = product.availableStock <= 0;

  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.imageWrap}>
        <ProductImage src={product.imageUrl} alt={product.name} />
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{product.category}</span>
          <span>{outOfStock ? 'Out of stock' : `${product.availableStock} in stock`}</span>
        </div>
        <h3 className={styles.name}>{product.name}</h3>
        <strong className={styles.price}>{formatMoney(product.price)}</strong>
        <div className={styles.actions}>
          <Link className="btn btn-ghost" to={`/products/${product.id}`}>
            View Details
          </Link>
          <button type="button" className="btn btn-primary" disabled={outOfStock} onClick={() => onAdd(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
