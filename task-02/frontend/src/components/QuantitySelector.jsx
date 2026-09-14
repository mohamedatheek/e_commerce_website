export default function QuantitySelector({ value, min = 1, max = 99, onChange }) {
  return (
    <div className="row">
      <button type="button" className="btn btn-ghost" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        −
      </button>
      <strong>{value}</strong>
      <button type="button" className="btn btn-ghost" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        +
      </button>
    </div>
  );
}
