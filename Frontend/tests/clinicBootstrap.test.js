import test from 'node:test'
import assert from 'node:assert/strict'
import { isPlatformHost } from '../src/utils/host.js'
import { loadClinicInfo, readCachedClinic, CLINIC_LOOKUP_TIMEOUT_MS } from '../src/utils/clinicBootstrap.js'

test('platform domains and local loopback never need tenant resolution', () => {
  for (const host of ['healibrate.com', 'www.healibrate.com', 'WWW.HEALIBRATE.COM', 'localhost', '127.0.0.1', '[::1]']) {
    assert.equal(isPlatformHost(host), true, host)
  }
  for (const host of ['apollo.healibrate.com', 'apollo.localhost', 'healibrate.com.example.org', 'random.vercel.app']) {
    assert.equal(isPlatformHost(host), false, host)
  }
})

test('platform startup completes without touching an unavailable backend or cached clinic', async () => {
  const get = () => { throw new Error('The marketing page must not request clinic data') }
  assert.deepEqual(await loadClinicInfo({ platformHost: true, get }), { clinic: null, error: null })
  assert.equal(readCachedClinic({ getItem() { throw new Error('No cache read expected') } }, true), null)
})

test('clinic hosts still fetch clinic info with an abort signal and bounded timeout', async () => {
  const controller = new AbortController()
  const clinic = { id: 'demo-clinic', name: 'Demo Clinic', branding: { primary_color: '#123456' } }
  let call
  const result = await loadClinicInfo({ platformHost: false, signal: controller.signal, get: async (...args) => {
    call = args
    return { data: { data: clinic } }
  } })
  assert.deepEqual(call, ['/clinic/info', { signal: controller.signal, timeout: CLINIC_LOOKUP_TIMEOUT_MS }])
  assert.deepEqual(result, { clinic, error: null })
})

test('missing clinics and temporary connection failures have distinct outcomes', async () => {
  for (const [failure, expected] of [
    [{ response: { status: 404 } }, 'not_found'],
    [{ response: { status: 503 } }, 'unavailable'],
    [{ response: { status: 500 } }, 'unavailable'],
    [{ response: { status: 429 } }, 'unavailable'],
    [{ code: 'ECONNABORTED' }, 'unavailable'],
    [{ code: 'ERR_NETWORK' }, 'unavailable'],
  ]) {
    const result = await loadClinicInfo({ platformHost: false, get: async () => { throw failure } })
    assert.deepEqual(result, { clinic: null, error: expected })
  }
})

test('an invalid API payload does not masquerade as a missing clinic', async () => {
  assert.deepEqual(await loadClinicInfo({ platformHost: false, get: async () => ({ data: '<html>Starting</html>' }) }), { clinic: null, error: 'unavailable' })
})

test('cancellation is not presented as a clinic outage', async () => {
  const controller = new AbortController()
  controller.abort()
  const canceled = { code: 'ERR_CANCELED' }
  await assert.rejects(loadClinicInfo({ platformHost: false, signal: controller.signal, get: async () => { throw canceled } }), error => error === canceled)
})

test('a successful retry recovers from the earlier connection failure', async () => {
  const get = async () => ({ data: { data: { id: 'clinic-a', name: 'Clinic A' } } })
  const failed = await loadClinicInfo({ platformHost: false, get: async () => { throw new Error('offline') } })
  const recovered = await loadClinicInfo({ platformHost: false, get })
  assert.equal(failed.error, 'unavailable')
  assert.equal(recovered.error, null)
  assert.equal(recovered.clinic.id, 'clinic-a')
})

test('malformed clinic cache cannot break page startup', () => {
  for (const value of ['{invalid', 'null', '[]', '"unexpected"']) {
    assert.equal(readCachedClinic({ getItem: () => value }, false), null)
  }
  const clinic = { id: 'clinic-a', name: 'Clinic A' }
  assert.deepEqual(readCachedClinic({ getItem: () => JSON.stringify(clinic) }, false), clinic)
})
