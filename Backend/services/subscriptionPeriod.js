/** Status alone does not prove that a monthly subscription is still paid. */
export function subscriptionPeriod(subscription, now = Date.now()) {
  if (!subscription) return { active: false, status: 'none', endsAt: null }
  // ends_at is an explicit termination date; next_billing_date is the paid
  // renewal boundary provided by Dodo. Honour whichever boundary comes first.
  const values = [subscription.ends_at, subscription.next_billing_date].filter(Boolean)
  const dates = values.map(value => new Date(value).getTime())
  if (!dates.length || dates.some(value => !Number.isFinite(value))) {
    return { active: false, status: subscription.status === 'active' ? 'unverified' : subscription.status, endsAt: null }
  }
  const end = Math.min(...dates)
  const active = subscription.status === 'active' && end > new Date(now).getTime()
  return { active, status: subscription.status === 'active' && !active ? 'expired' : subscription.status, endsAt: new Date(end).toISOString() }
}
