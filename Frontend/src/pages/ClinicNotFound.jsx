import Logo from '../components/Logo'

/**
 * Shown on a clinic subdomain that resolves to no active clinic.
 *
 * Previously these hosts fell through to the marketing site, which meant every
 * made-up subdomain served a full copy of the homepage — an unlimited supply
 * of duplicate pages for a crawler to find. Now they get this instead, and
 * useRobotsPolicy keeps the whole subdomain out of search.
 */
export default function ClinicNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-6 text-center">
      <Logo size="sm" />

      <div className="mt-8 max-w-md">
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          This booking page isn't available
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          The link you followed may be mistyped, or this clinic is no longer
          taking online bookings. If you have an appointment to make, please
          contact the clinic directly.
        </p>

        <a
          href="https://www.healibrate.com"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Learn about Healibrate
        </a>
      </div>
    </div>
  )
}
