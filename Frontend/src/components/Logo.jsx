export default function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }
  return (
    <div className={`font-display font-semibold ${sizes[size]} text-brand-700 flex items-center gap-2`}>
      <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </span>
      MediBook
    </div>
  )
}
