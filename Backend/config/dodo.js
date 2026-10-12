export class DodoConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DodoConfigurationError'
    this.code = 'payment_environment_invalid'
    this.status = 503
  }
}

/** Use one active set of credentials matching the selected test or live API. */
export function dodoConfig(env = process.env) {
  const apiBase = (env.DODO_API_BASE || 'https://test.dodopayments.com').trim().replace(/[,/\s]+$/, '')
  if (!['https://test.dodopayments.com', 'https://live.dodopayments.com'].includes(apiBase)) {
    throw new DodoConfigurationError('The payment API address is invalid. Use the Dodo test or live API base, not a checkout or product URL.')
  }
  const environment = apiBase.includes('://live.') ? 'live' : 'test'
  const prefix = 'DODO_'
  const get = name => typeof env[`${prefix}${name}`] === 'string' ? env[`${prefix}${name}`].trim() : ''
  return {
    apiBase, environment, prefix,
    apiKey: get('API_KEY'),
    webhookSecret: get('WEBHOOK_SECRET'),
    products: Object.fromEntries(['basic', 'growth', 'pro'].map(plan => [plan, get(`PRODUCT_${plan.toUpperCase()}`)])),
  }
}
