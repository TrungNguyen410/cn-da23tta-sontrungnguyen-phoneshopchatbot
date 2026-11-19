// KPI tile with a small 3D glyph (an extruded rounded tile) in the card corner.
export default function StatCard({ label, value, change, icon: Icon, color = 'blue' }) {
  return (
    <article className={`stat-card stat-${color}`}>
      <div className={`stat-icon ${color}`}>
        <span className="stat-glyph" aria-hidden="true"><i /><i /><i /></span>
        <Icon />
      </div>
      <div><span>{label}</span><strong>{value}</strong><small>{change}</small></div>
    </article>
  );
}
