// HTTP carries the canonical subscription flags; sockets provide the same reason
// when a connection is rejected before the schedule response has arrived.
export function doctorAccessIssue({ liveStatus, errorDetails, socketReason }) {
  if (liveStatus === 'expired') return { title: 'Your session has expired', message: 'Sign in again to continue using your doctor portal.', signIn: true }
  const reason = errorDetails?.subscription_expired ? 'subscription_expired'
    : errorDetails?.subscription_required ? 'subscription_required' : socketReason
  if (reason === 'subscription_expired') return { title: 'Your clinic’s subscription has expired', message: 'Ask your clinic administrator to renew the plan. Your appointments will be available again once the renewal is confirmed.' }
  if (reason === 'subscription_required') return { title: 'Your clinic’s subscription needs verification', message: 'Ask your clinic administrator to review Plan & Billing and confirm the clinic’s current paid plan.' }
  if (reason === 'account_inactive') return { title: 'Your doctor account is inactive', message: 'Ask your clinic administrator to reactivate your account.' }
  if (reason === 'clinic_inactive') return { title: 'Your clinic is inactive', message: 'Ask your clinic administrator to contact support to restore access.' }
  if (liveStatus === 'forbidden') return { title: 'Doctor portal access is unavailable', message: 'Ask your clinic administrator to check your doctor account and clinic subscription.' }
  return null
}
