export function StaffHeader({ title, description, eyebrow = 'Clinic workspace', children }) {
  return <header className="staff-heading"><div><p className="staff-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="staff-description">{description}</p></div>{children && <div className="staff-heading-actions">{children}</div>}</header>
}
export function MetricCard({ label, value, sub, tone = 'blue', icon }) {
  return <div className={`staff-metric tone-${tone}`}><div className="staff-metric-label">{label}{icon && <span aria-hidden="true">{icon}</span>}</div><p className="staff-metric-value">{value ?? '—'}</p>{sub && <p className="staff-metric-sub">{sub}</p>}</div>
}
