export default function StatCard({ label, value, change, icon: Icon, color = 'blue' }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`}><Icon /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{change}</small></div>
    </article>
  );
}
