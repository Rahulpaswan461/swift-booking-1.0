import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/axios'
import Logo from '../../components/Logo'
import { clinicDomain } from '../../utils/clinicUrl'

const slugify = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 46)

export default function RegisterClinic() {
  const [form, setForm] = useState({ name: '', slug: '', ownerEmail: '', password: '', address: '', specialization: '' })
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.post('/admin/clinics', form)

      // Store admin token and info
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin', JSON.stringify({
        id: res.data.admin.id,
        fullName: res.data.admin.fullName,
        email: res.data.admin.email,
        clinic_id: res.data.clinic.id,
        clinicName: res.data.clinic.name,
        clinicSlug: res.data.clinic.slug,
        trialEndsAt: res.data.clinic.trial_ends_at
      }))

      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="flex items-center justify-between border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <Logo />
        <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">Get Started</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-surface-100 bg-white p-8 shadow-xl shadow-gray-900/5 animate-fade-up sm:p-10">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-brand-100 bg-brand-50">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L2 7l9 5 9-5-9-5z" stroke="#1d7f72" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M2 12l9 5 9-5" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l9 5 9-5" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="text-3xl font-display font-semibold text-center text-gray-900 mb-2">
              Register Your Clinic
            </h1>
            <p className="text-gray-500 text-center text-sm mb-4">
              Get your own booking page in minutes
            </p>
            <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4L7 10.2 3.3 12.1l.7-4-3-2.9 4.2-.6L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Free during Early Access — no card required
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Clinic Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value, slug: slugEdited ? form.slug : slugify(e.target.value) })}
                  placeholder="Apollo Physiotherapy" required
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                <p className="text-xs text-gray-400 mt-1">Your booking page: <span className="font-mono font-semibold">{clinicDomain(form.slug || 'your-clinic')}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Subdomain Slug <span className="font-normal text-gray-400">(auto-generated, editable)</span></label>
                <input type="text" value={form.slug}
                  onChange={e => { setSlugEdited(true); setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }) }}
                  placeholder="apollo-clinic" required
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Your Email</label>
                <input type="email" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                  placeholder="you@clinic.com" required
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters" required minLength={8}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 pr-11 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Specialization</label>
                <input type="text" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
                  placeholder="Physiotherapy" required
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Address <span className="font-normal text-gray-400">(optional)</span></label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
                    <path d="M7 4v3M7 9.5v .5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Creating clinic...
                  </>
                ) : 'Create Clinic & Get Started'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Already have a clinic?{' '}
                <button type="button" onClick={() => navigate('/admin/login')}
                  className="font-semibold text-brand-600 hover:text-brand-700 transition">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
