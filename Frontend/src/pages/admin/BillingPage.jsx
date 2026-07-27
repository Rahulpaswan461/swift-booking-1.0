import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    tagline: 'For solo practitioners',
    features: ['1 doctor', 'Booking page & link', 'Appointment management', 'Email confirmations & reminders'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 299,
    highlighted: true,
    tagline: 'For growing clinics',
    features: ['Up to 5 doctors', 'Custom branding & badges', 'Patient summary with visit tags', 'Product support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    tagline: 'For established clinics',
    features: ['Unlimited doctors', 'Session notes & patient history', 'SMS confirmations', 'Onboarding assistance'],
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Dodo subscription statuses that mean the payment did NOT succeed (declined,
// cancelled, expired). Anything else that isn't active is treated as still
// processing, so we keep waiting rather than crying failure prematurely.
const DECLINED_STATUSES = new Set([
  'failed', 'cancelled', 'canceled', 'expired', 'declined', 'incomplete_expired', 'payment_failed',
])
const isDeclined = (status) => DECLINED_STATUSES.has(String(status || '').toLowerCase())

export default function BillingPage() {
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState('')
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const paymentSuccess = searchParams.get('status') === 'success'
  const subscriptionId =
    searchParams.get('subscription_id') || searchParams.get('subscriptionId')
  // Post-payment state: 'processing' | 'active' | 'pending' | 'failed' | null
  const [postPay, setPostPay] = useState(paymentSuccess ? 'processing' : null)

  useEffect(() => {
    let cancelled = false
    const fetchClinic = async () => {
      try {
        const res = await adminApi.get('/admin/clinic/me')
        return res.data.data
      } catch {
        return null
      }
    }
    const cleanUrl = () => window.history.replaceState({}, '', '/admin/billing')

    const run = async () => {
      // Normal visit (not returning from checkout).
      if (!paymentSuccess) {
        const c = await fetchClinic()
        if (!cancelled) { setClinic(c); setLoading(false) }
        return
      }

      // Returning from Dodo. The webhook is the source of truth, so we POLL
      // clinic/me while it activates the plan. We also fire one verify call as
      // an accelerator + fallback in case the webhook is delayed or unreachable.
      if (!cancelled) setLoading(false)

      let verifyResult = null
      if (subscriptionId) {
        adminApi.post('/admin/billing/verify', { subscription_id: subscriptionId })
          .then((r) => { verifyResult = r.data })
          .catch(() => {})
      }

      const deadline = Date.now() + 30000 // wait up to ~30s
      while (!cancelled) {
        const c = await fetchClinic()
        if (cancelled) return
        if (c) setClinic(c)
        if (c?.subscription_active) { setPostPay('active'); cleanUrl(); return }
        // Verify came back with a definitive decline → stop waiting.
        if (verifyResult && verifyResult.active === false && isDeclined(verifyResult.status)) {
          setPostPay('failed'); cleanUrl(); return
        }
        if (Date.now() >= deadline) break
        await sleep(2500)
      }

      if (!cancelled) {
        // Timed out. If verify told us it was declined, show failure; otherwise
        // it's genuinely still processing (webhook not in yet).
        setPostPay(verifyResult && isDeclined(verifyResult.status) ? 'failed' : 'pending')
        cleanUrl()
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  const earlyAccess = clinic?.early_access
  const subscriptionActive = clinic?.subscription_active
  const currentPlan = subscriptionActive ? clinic?.subscription_plan : null

  const startCheckout = async (planId) => {
    setError('')
    setRedirecting(planId)
    try {
      // Send our current origin so the backend returns us to the SAME origin
      // after payment — our admin session token is per-origin, and landing on
      // a different one would look logged-out and bounce us to the login page.
      const res = await adminApi.post('/admin/billing/checkout', {
        plan: planId,
        returnOrigin: window.location.origin,
      })
      window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the checkout. Please try again.')
      setRedirecting('')
    }
  }

  return (
    <div className="flex min-h-screen bg-surface-50">
      <AdminSidebar />

      <main className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink-900">Plan & Billing</h1>
          <p className="mt-1 text-sm text-gray-500">Your subscription, and what each plan unlocks</p>
        </div>

        {postPay === 'processing' && (
          <div className="mb-6 flex max-w-4xl items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
            <svg className="animate-spin text-brand-600" width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-semibold text-brand-800">Confirming your payment…</p>
          </div>
        )}
        {postPay === 'active' && (
          <div className="mb-6 max-w-4xl rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="text-sm font-semibold text-green-800">
              Payment received — your {clinic?.entitlements?.plan_label} plan is active.
            </p>
            <p className="mt-0.5 text-sm text-green-700">Your clinic is live. All plan features are unlocked.</p>
          </div>
        )}
        {postPay === 'failed' && (
          <div className="mb-6 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-800">Payment didn’t go through</p>
            <p className="mt-0.5 text-sm text-red-700">
              The payment was declined or cancelled, so no plan was activated. Please try again below.
              If you believe you were charged, contact support and we’ll sort it out.
            </p>
          </div>
        )}
        {postPay === 'pending' && (
          <div className="mb-6 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">Payment received — finalizing your plan</p>
            <p className="mt-0.5 text-sm text-amber-700">
              This is taking a little longer than usual to confirm. Your plan will activate automatically —
              refresh in a moment. If it doesn’t activate shortly, contact support.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 max-w-4xl rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Current plan */}
        {!loading && (
          earlyAccess ? (
            <div className="mb-8 max-w-4xl rounded-2xl border border-surface-100 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Current plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-display text-2xl font-semibold text-ink-900">
                  {clinic?.entitlements?.plan_label || 'Basic'}
                </span>
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  All features enabled
                </span>
              </div>
            </div>
          ) : subscriptionActive ? (
            <div className="mb-8 max-w-4xl rounded-2xl border border-surface-100 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Current plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-display text-2xl font-semibold text-ink-900">
                  {clinic?.entitlements?.plan_label}
                </span>
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  Active
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-8 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">No active plan</p>
              <p className="mt-2 font-display text-xl font-semibold text-ink-900">
                Choose a plan to activate your clinic
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Your booking page and dashboard stay locked until you subscribe. Pick a plan below to go live.
              </p>
            </div>
          )
        )}

        {/* Plans */}
        <div className="grid max-w-4xl gap-5 lg:grid-cols-3">
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.id
            return (
              <div key={plan.id}
                className={`relative flex flex-col rounded-[24px] border bg-white p-6
                  ${plan.highlighted ? 'border-brand-300 shadow-lg shadow-brand-900/10' : 'border-surface-100 shadow-sm'}`}>
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-xl font-semibold text-ink-900">{plan.name}</h2>
                <p className="text-xs text-gray-400">{plan.tagline}</p>
                <p className="mt-3">
                  <span className="font-display text-3xl font-semibold text-ink-900">₹{plan.price}</span>
                  <span className="text-sm text-gray-400"> /month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="mt-0.5 flex-shrink-0" width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3 3 6-6" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={isCurrent || !!redirecting}
                  className={`mt-5 w-full rounded-xl py-3 text-sm font-bold transition
                    ${isCurrent
                      ? 'cursor-default border border-green-200 bg-green-50 text-green-700'
                      : plan.highlighted
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60'}`}
                >
                  {isCurrent ? 'Your current plan' : redirecting === plan.id ? 'Opening checkout…' : `Subscribe — ₹${plan.price}/mo`}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-6 max-w-4xl text-xs leading-relaxed text-gray-400">
          Payments are processed securely by Dodo Payments. Subscriptions renew monthly and can be
          cancelled anytime — your data always stays yours.
        </p>
      </main>
    </div>
  )
}
