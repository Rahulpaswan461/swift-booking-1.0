import Logo from '../components/Logo'

export default function ClinicUnavailable({ onRetry }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-6 text-center">
      <Logo size="sm" />
      <div className="mt-8 max-w-md" role="alert">
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          We couldn’t connect to the clinic
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          The booking service is taking longer than usual. Please try again in a moment.
          If you need to book urgently, contact the clinic directly.
        </p>
        <button type="button" onClick={onRetry} className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100">
          Try again
        </button>
      </div>
    </main>
  )
}
