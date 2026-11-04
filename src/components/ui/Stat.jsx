export function Stat({ label, value, note, icon: Icon }) {
  return (
    <div className="stat">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
