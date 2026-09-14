export default function EmptyState({ title, body }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
