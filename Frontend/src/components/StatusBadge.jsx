export default function StatusBadge({ status }) {
  const config = {
    confirmed: { label: 'Confirmed', bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
    completed: { label: 'Completed', bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-400'   },
    no_show:   { label: 'No Show',   bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
    pending:   { label: 'Pending',   bg: 'bg-gray-50',   text: 'text-gray-600',  dot: 'bg-gray-400'  },
  }
  const c = config[status] || config.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${c.bg} ${c.text} border-transparent`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {c.label}
    </span>
  )
}
