import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { itemCount } = useCart();

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <strong>ULM Traders</strong>
          <span>Checkout Lab</span>
        </NavLink>
        <nav className={styles.links}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Products
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Orders
          </NavLink>
          <NavLink to="/cart" className={styles['cart-link']}>
            Cart ({itemCount})
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
