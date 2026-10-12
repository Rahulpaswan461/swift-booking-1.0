const labels = {
  subscription_expired: ['Clinic plan expired', 'bg-amber-500', 'Ask your clinic administrator to renew the clinic plan.'],
  connecting: ['Connecting', 'bg-amber-400', 'Connecting to live updates. The server may take a moment to wake up.'],
  live: ['Live updates', 'bg-emerald-500', 'Appointment changes appear automatically.'],
  reconnecting: ['Reconnecting', 'bg-amber-400', 'Reconnecting. Your schedule will catch up automatically.'],
  expired: ['Session expired', 'bg-red-500', 'Sign in again to receive updates.'],
  forbidden: ['Access unavailable', 'bg-red-500', 'Contact your clinic administrator about your account or subscription.'],
}
export default function LiveStatus({ status }) {
  const [label, dot, description] = labels[status] || labels.connecting
  return <span title={description} role="status" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}
  </span>
}
