export default function StepIndicator({ current }) {
  const steps = ['Verify Email', 'Choose Doctor', 'Book Slot']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-gray-100 text-gray-400'}`}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : idx}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${active ? 'text-brand-700' : done ? 'text-brand-500' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 ${done ? 'bg-brand-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
