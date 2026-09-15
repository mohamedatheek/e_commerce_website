import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { fetchCategories, fetchProducts } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const INITIAL_FILTERS = {
  search: '',
  category: 'all',
  minPrice: '',
  maxPrice: '',
  inStock: false,
  sort: 'newest',
};

export default function ProductsPage() {
  const { addItem } = useCart();
  const { push } = useToast();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories()
      .then((result) => setCategories(Array.isArray(result) ? result : []))
      .catch((err) => {
        setCategories([]);
        push(err.message, 'error');
      });
  }, [push]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError('');
      fetchProducts({
        search: filters.search || undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        inStock: filters.inStock ? 'true' : undefined,
        sort: filters.sort,
      })
        .then((result) => setProducts(Array.isArray(result) ? result : []))
        .catch((err) => {
          setProducts([]);
          setError(err.message);
          push(err.message, 'error');
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [filters, push]);

  function update(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleAdd(product) {
    try {
      addItem(product, 1);
      push(`${product.name} added to cart`, 'success');
    } catch (error) {
      push(error.message, 'error');
    }
  }

  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">Product discovery</p>
        <h1>A small catalog with real inventory rules</h1>
        <p className="muted">
          Search, filter, and reserve stock through checkout. Totals and availability are always
          calculated on the server.
        </p>
      </div>

      <div className="card filters">
        <label className="field">
          <span>Search name or description</span>
          <input
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="phone, lamp, denim…"
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={filters.category} onChange={(event) => update('category', event.target.value)}>
            <option value="all">All</option>
            {Array.isArray(categories) &&
              categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Min price</span>
          <input
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => update('minPrice', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Max price</span>
          <input
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => update('maxPrice', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label className="field" style={{ alignContent: 'end' }}>
          <span>Availability</span>
          <label className="row">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(event) => update('inStock', event.target.checked)}
            />
            In stock only
          </label>
        </label>
      </div>

      {loading ? (
        <Loading label="Loading products…" />
      ) : error ? (
        <EmptyState title="Could not load products" body={error} />
      ) : !Array.isArray(products) ? (
        <EmptyState title="Unable to load products" body="The product list was not a valid array." />
      ) : products.length === 0 ? (
        <EmptyState title="No matching products" body="Try clearing a filter or searching a different term." />
      ) : (
        <div className="grid product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </section>
  );
}
