import { subscriptionPeriod } from "../services/subscriptionPeriod.js"
import jwt from 'jsonwebtoken'

function denied(message, code, reason) {
  const error = new Error(message)
  error.code = code
  error.reason = reason
  return error
}

export function createStaffAuthenticator({ secret, db, loadSubscription, earlyAccess }) {
  return async token => {
    let identity
    try {
      if (typeof token !== 'string' || !token) throw new Error()
      identity = jwt.verify(token, secret, { algorithms: ['HS256'] })
      if (!['doctor', 'admin'].includes(identity.role) || !identity.id || !identity.clinic_id || !identity.exp) throw new Error()
    } catch {
      throw denied('Your session has expired. Please sign in again.', 'unauthorized')
    }
    let results
    try {
      results = await Promise.all([
        db.from(identity.role === 'doctor' ? 'doctors' : 'admins').select(identity.role === 'doctor' ? 'id, clinic_id, is_active' : 'id, clinic_id').eq('id', identity.id).eq('clinic_id', identity.clinic_id).single(),
        loadSubscription(identity.clinic_id),
      ])
    } catch {
      throw denied('Unable to verify your account. Retrying shortly.', 'unavailable')
    }
    const [{ data: staff, error }, access] = results
    if (error) throw denied('Unable to verify your account. Retrying shortly.', 'unavailable')
    if (!staff || (identity.role === 'doctor' && !staff.is_active)) throw denied('Your doctor account is inactive.', 'forbidden', 'account_inactive')
    if (!access?.clinic?.is_active) throw denied('Your clinic is inactive.', 'forbidden', 'clinic_inactive')
    if (!earlyAccess && !subscriptionPeriod(access.subscription).active) {
      const reason = subscriptionPeriod(access.subscription).status === 'expired' ? 'subscription_expired' : 'subscription_required'
      throw denied('Your clinic subscription needs attention.', 'forbidden', reason)
    }
    return { id: identity.id, role: identity.role, clinic_id: identity.clinic_id, exp: identity.exp }
  }
}
