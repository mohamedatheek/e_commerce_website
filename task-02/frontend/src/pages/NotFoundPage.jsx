import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page">
      <div className="hero">
        <p className="eyebrow">404</p>
        <h1>This page is not on the map</h1>
        <p className="muted">The route does not exist in the ULM Traders storefront.</p>
        <Link className="btn btn-primary" to="/">
          Back to products
        </Link>
      </div>
    </section>
  );
}
