// Read-only diagnosis of the active payment configuration. Never uses backup
// credentials, changes products, creates a checkout, or prints API keys.
import 'dotenv/config'
import { dodoConfig } from '../config/dodo.js'
const args = process.argv.slice(2)
if (args.length && !(args.length === 2 && args[0] === '--environment' && ['test', 'live'].includes(args[1]))) {
  console.error('Usage: npm run check:billing -- [--environment test|live]')
  process.exit(1)
}
let config
try {
  config = dodoConfig()
  if (args.length && args[1] !== config.environment) {
    throw new Error(`DODO_API_BASE selects ${config.environment}, but you requested ${args[1]}. Activate the matching URL, API key, product IDs and webhook secret first.`)
  }
} catch (error) { console.error(error.message); process.exit(1) }
const { apiBase: base, environment, apiKey: key, prefix } = config
console.log(`Checking ${environment} billing configuration from the active environment (.env or hosting variables).`)
if (!key) { console.error(`${prefix}API_KEY is missing.`); process.exit(1) }
try {
  const get = async path => {
    const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) })
    return { status: res.status, ok: res.ok, body: await res.json().catch(() => ({})) }
  }
  const catalog = await get('/products?page_size=1')
  if (!catalog.ok) {
    console.error([401,403].includes(catalog.status)
      ? `API key rejected by ${environment} mode (HTTP ${catalog.status}). Use an API key created in this same Dodo environment.`
      : `Dodo product lookup failed (HTTP ${catalog.status}).`)
    process.exitCode = 1
  } else {
    console.log(`API key accepted by ${environment} mode.`)
    for (const plan of ['BASIC', 'GROWTH', 'PRO']) {
      const id = config.products[plan.toLowerCase()]
      if (!id) { console.error(`${plan}: ${prefix}PRODUCT_${plan} is missing.`); process.exitCode = 1; continue }
      const product = await get(`/products/${encodeURIComponent(id)}`)
      if (!product.ok) {
        console.error(`${plan}: configured product unavailable in ${environment} mode (HTTP ${product.status}). Copy this environment's product ID into ${prefix}PRODUCT_${plan}.`)
        process.exitCode = 1
      } else if (product.body.is_archived || product.body.price?.type !== 'recurring_price') {
        console.error(`${plan}: must be an active recurring subscription product.`)
        process.exitCode = 1
      } else {
        const price = product.body.price
        console.log(`${plan}: product found; ${price.currency} ${(price.price / 100).toFixed(2)}, every ${price.payment_frequency_count} ${price.payment_frequency_interval}.`)
      }
    }
    if (!config.webhookSecret) { console.error(`${prefix}WEBHOOK_SECRET is missing.`); process.exitCode = 1 }
    else console.log('Webhook secret is present; its validity still requires a signed event from the configured environment.')
  }
} catch (error) {
  console.error(`Cannot reach the ${environment} payment service (${error.cause?.code || error.name}).`)
  process.exitCode = 1
}
