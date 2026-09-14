export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="card loading">
      <p className="muted">{label}</p>
    </div>
  );
}
