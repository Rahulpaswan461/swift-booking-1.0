import { dodoConfig } from "../config/dodo.js"
// Hosted checkout collects billing details; never invent an address or charge
// a saved payment method while opening a session.
export class CheckoutError extends Error {
  constructor(code, message, status = 502, diagnostics = {}) {
    super(message)
    this.name = 'CheckoutError'
    this.code = code
    this.status = status
    this.diagnostics = diagnostics
  }
}

export function checkoutPlan(value) {
  const plan = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return ['basic', 'growth', 'pro'].includes(plan) ? plan : null
}

export async function createHostedCheckout({ plan, clinic, adminEmail, returnUrl }, { env = process.env, fetchImpl = fetch } = {}) {
  const normalized = checkoutPlan(plan)
  if (!normalized) throw new CheckoutError('invalid_plan', 'Choose a valid plan: basic, growth, or pro.', 400)
  const config = dodoConfig(env)
  const { apiBase: base, environment, apiKey: key, webhookSecret, prefix } = config
  const product = config.products[normalized]
  if (!key) {
    throw new CheckoutError('payments_not_configured', `${environment === 'test' ? 'Test' : 'Live'} checkout is not configured yet. Contact platform support to connect this payment environment.`, 503, { environment, missing_setting: `${prefix}API_KEY` })
  }
  if (!webhookSecret) {
    throw new CheckoutError('payment_webhook_missing', `${environment === 'test' ? 'Test' : 'Live'} payment confirmation is not configured yet. Contact platform support to finish connecting this environment.`, 503, { environment, missing_setting: `${prefix}WEBHOOK_SECRET` })
  }
  if (!product) {
    throw new CheckoutError('payment_product_missing', `The ${normalized} plan is not connected to ${environment} checkout yet. Contact platform support to configure this plan.`, 503, { environment, missing_setting: `${prefix}PRODUCT_${normalized.toUpperCase()}` })
  }
  const email = typeof adminEmail === 'string' ? adminEmail.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutError('billing_email_missing', 'Your billing email is missing or invalid. Sign in again, or contact platform support to update it.', 422)
  }
  if (!clinic?.id) throw new CheckoutError('clinic_missing', 'Your clinic could not be identified. Sign in again.', 400)
  try {
    const target = new URL(returnUrl)
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('protocol')
  } catch {
    throw new CheckoutError('payment_return_url_invalid', 'The billing return address needs a configuration update. Contact platform support.', 503)
  }
  let response, body
  try {
    response = await fetchImpl(`${base}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        product_cart: [{ product_id: product, quantity: 1 }],
        customer: { email, name: clinic.name || 'Clinic admin' },
        return_url: returnUrl,
        metadata: { clinic_id: clinic.id, plan: normalized, payment_environment: environment },
      }),
    })
    body = await response.json().catch(() => ({}))
  } catch (error) {
    const timeout = ['TimeoutError', 'AbortError'].includes(error.name)
    throw new CheckoutError(timeout ? 'payment_connection_timeout' : 'payment_connection_failed', timeout
      ? 'The payment service took too long to respond. Please try again in a moment.'
      : 'We could not connect to the payment service. Please try again shortly. If this continues, contact platform support.', timeout ? 504 : 502,
    { network_code: error.cause?.code || error.code || error.name })
  }
  if (!response.ok) {
    // Provider details can contain account data. Classify them here; expose only
    // an actionable message and log status/code, never credentials or the body.
    const detail = JSON.stringify(body)
    const diagnostics = { environment, plan: normalized, provider_status: response.status, provider_code: typeof body.code === 'string' ? body.code.slice(0, 80) : undefined }
    if ([401, 403].includes(response.status)) throw new CheckoutError('payment_credentials_rejected', `The ${environment} payment service rejected the configured API key. Platform support needs to use an API key from the same environment.`, 503, diagnostics)
    if (response.status === 404 || ([400, 422].includes(response.status) && /product|recurring|archived/i.test(detail))) throw new CheckoutError('payment_product_unavailable', `The ${normalized} product could not be used in ${environment} mode. Platform support needs to check the product ID for this environment.`, 503, diagnostics)
    if (response.status === 429) throw new CheckoutError('payment_rate_limited', 'The payment service is busy. Please wait a minute before trying again.', 503, diagnostics)
    if (response.status >= 500) throw new CheckoutError('payment_provider_unavailable', 'The payment service is temporarily unavailable. Please try again shortly.', 502, diagnostics)
    throw new CheckoutError('payment_request_rejected', 'The payment service could not accept the checkout details. Contact platform support with the reference below.', 502, diagnostics)
  }
  let url
  try {
    url = new URL(body.checkout_url)
    if (url.protocol !== 'https:') throw new Error('invalid protocol')
  } catch {
    throw new CheckoutError('payment_link_missing', 'The payment service did not return a valid checkout link. Please try again or contact platform support.')
  }
  return { url: url.href, session_id: body.session_id || null }
}
