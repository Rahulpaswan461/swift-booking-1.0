import test from 'node:test'
import assert from 'node:assert/strict'
import { DodoConfigurationError } from '../config/dodo.js'
import { CheckoutError, createHostedCheckout } from '../services/dodoCheckout.js'

const env = { DODO_API_KEY: 'test-key', DODO_WEBHOOK_SECRET: 'test-webhook', DODO_PRODUCT_GROWTH: 'pdt_growth' }
const input = { plan: 'growth', clinic: { id: 'clinic-1', name: 'Example clinic' }, adminEmail: 'admin@example.com', returnUrl: 'http://example.localhost:5173/admin/billing?from=checkout' }
const response = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data })

test('opens a hosted checkout without fabricated billing details or immediate charges', async () => {
  let request
  const result = await createHostedCheckout(input, { env, fetchImpl: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) }
    return response(200, { checkout_url: 'https://test.checkout.dodopayments.com/session/cks_test', session_id: 'cks_test' })
  } })
  assert.equal(request.url, 'https://test.dodopayments.com/checkouts')
  assert.deepEqual(request.body.product_cart, [{ product_id: 'pdt_growth', quantity: 1 }])
  assert.deepEqual(request.body.metadata, { clinic_id: 'clinic-1', plan: 'growth', payment_environment: 'test' })
  assert.equal(request.body.return_url, input.returnUrl)
  assert.equal(Object.hasOwn(request.body, 'billing'), false)
  assert.equal(Object.hasOwn(request.body, 'billing_address'), false)
  assert.equal(Object.hasOwn(request.body, 'confirm'), false)
  assert.ok(request.options.signal instanceof AbortSignal)
  assert.equal(result.session_id, 'cks_test')
})

test('invalid plans and missing configuration never call the payment service', async () => {
  const fetchImpl = async () => assert.fail('must not call provider')
  for (const [change, config, code] of [
    [{ plan: 'nonsense' }, env, 'invalid_plan'],
    [{ plan: { toString: () => 'growth' } }, env, 'invalid_plan'],
    [{}, { ...env, DODO_PRODUCT_GROWTH: ' ' }, 'payment_product_missing'],
    [{}, { ...env, DODO_API_KEY: ' ' }, 'payments_not_configured'],
    [{}, { ...env, DODO_API_BASE: 'https://untrusted.example' }, 'payment_environment_invalid'],
    [{ adminEmail: undefined }, env, 'billing_email_missing'],
    [{ returnUrl: 'javascript:alert(1)' }, env, 'payment_return_url_invalid'],
  ]) await assert.rejects(createHostedCheckout({ ...input, ...change }, { env: config, fetchImpl }), error => (error instanceof CheckoutError || error instanceof DodoConfigurationError) && error.code === code)
})

test('distinguishes provider configuration, rate limits and service failures without exposing its body', async () => {
  for (const [status, body, code] of [
    [401, { message: 'secret credential contents' }, 'payment_credentials_rejected'],
    [403, {}, 'payment_credentials_rejected'],
    [404, { message: 'Product not found' }, 'payment_product_unavailable'],
    [422, { message: 'Invalid product' }, 'payment_product_unavailable'],
    [429, {}, 'payment_rate_limited'],
    [503, {}, 'payment_provider_unavailable'],
    [422, { message: 'private account contents' }, 'payment_request_rejected'],
  ]) await assert.rejects(createHostedCheckout(input, { env, fetchImpl: async () => response(status, body) }), error => {
    assert.equal(error.code, code)
    assert.equal(error.diagnostics.provider_status, status)
    assert.doesNotMatch(error.message, /secret credential|private account/)
    return true
  })
})

test('reports network resets and timeouts separately', async () => {
  for (const [failure, code, status] of [
    [Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } }), 'payment_connection_failed', 502],
    [Object.assign(new Error('timeout'), { name: 'TimeoutError' }), 'payment_connection_timeout', 504],
  ]) await assert.rejects(createHostedCheckout(input, { env, fetchImpl: async () => { throw failure } }), error => error.code === code && error.status === status)
})

test('rejects missing and unsafe checkout links', async () => {
  for (const checkout_url of [undefined, 'javascript:alert(1)', 'http://checkout.example']) {
    await assert.rejects(createHostedCheckout(input, { env, fetchImpl: async () => response(200, { checkout_url }) }), error => error.code === 'payment_link_missing')
  }
})

test('uses the configured live environment and trims pasted configuration whitespace', async () => {
  const result = await createHostedCheckout(input, { env: { ...env, DODO_API_BASE: 'https://live.dodopayments.com/ ', DODO_PRODUCT_GROWTH: ' pdt_growth ', DODO_API_KEY: ' test-key ' }, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://live.dodopayments.com/checkouts')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.equal(JSON.parse(options.body).product_cart[0].product_id, 'pdt_growth')
    return response(200, { checkout_url: 'https://checkout.dodopayments.com/session/cks_live' })
  } })
  assert.match(result.url, /^https:/)
})


test('live and test errors identify the environment without exposing credentials', async () => {
  for (const environment of ['test', 'live']) {
    for (const [status, code] of [[401, 'payment_credentials_rejected'], [404, 'payment_product_unavailable']]) {
      await assert.rejects(createHostedCheckout(input, {
        env: { ...env, DODO_API_BASE: `https://${environment}.dodopayments.com` },
        fetchImpl: async () => response(status, { message: 'The requested resource could not be found.' }),
      }), error => {
        assert.equal(error.code, code)
        assert.equal(error.diagnostics.environment, environment)
        assert.match(error.message, new RegExp(environment))
        assert.doesNotMatch(error.message, /test-key|test-webhook|pdt_growth/)
        return true
      })
    }
  }
})


test('checkout uses the original variables in both test and live modes', async () => {
  for (const mode of ['test', 'live']) {
    const configured = {
      DODO_API_BASE: `https://${mode}.dodopayments.com`,
      DODO_API_KEY: `${mode === 'test' ? 'sandbox' : 'production'}-key`,
      DODO_WEBHOOK_SECRET: `${mode}-hook`,
      DODO_PRODUCT_GROWTH: `pdt_${mode === 'test' ? 'sandbox' : 'production'}`,
    }
    await createHostedCheckout(input, { env: configured, fetchImpl: async (url, options) => {
      assert.equal(url, `https://${mode}.dodopayments.com/checkouts`)
      assert.equal(options.headers.Authorization, `Bearer ${mode === 'test' ? 'sandbox' : 'production'}-key`)
      assert.equal(JSON.parse(options.body).product_cart[0].product_id, `pdt_${mode === 'test' ? 'sandbox' : 'production'}`)
      assert.equal(JSON.parse(options.body).metadata.payment_environment, mode)
      return response(200, { checkout_url: 'https://checkout.dodopayments.com/session/cks_test' })
    } })
  }
})

test('a missing active key cannot fall back to obsolete scoped keys', async () => {
  await assert.rejects(createHostedCheckout(input, { env: {
    ...env, DODO_API_KEY: '', DODO_TEST_API_KEY: 'old-test-key', DODO_LIVE_API_KEY: 'live-key', DODO_TEST_PRODUCT_GROWTH: 'pdt_test', DODO_TEST_WEBHOOK_SECRET: 'test-secret',
  }, fetchImpl: async () => assert.fail('must not fall back to live payments') }), error => error.code === 'payments_not_configured' && error.diagnostics.missing_setting === 'DODO_API_KEY')
})
