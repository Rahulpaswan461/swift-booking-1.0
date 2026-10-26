import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicPageCache, PUBLIC_PAGE_TTL_MS, isPublicPageMutation } from '../src/utils/publicPageCache.js'

function setup() {
  const entries = new Map()
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  let time = 1000, site = 'https://alpha.example|same-origin', calls = 0
  const options = { storage: () => storage, scope: () => site, now: () => time }
  const get = async path => { calls++; return { data: { data: path === '/clinic/info' ? { id: site, name: 'Clinic' } : [{ id: 'doctor-a', full_name: 'Doctor A', is_active: true }] } } }
  return { entries, options, get, cache: createPublicPageCache(options), calls: () => calls,
    advance: ms => { time += ms }, site: value => { site = value } }
}

test('refreshes and new cache instances reuse successful public reads until expiry', async () => {
  const s = setup()
  for (const path of ['/clinic/info', '/doctors']) await s.cache.read(path, { get: s.get })
  const reloaded = createPublicPageCache(s.options)
  for (const path of ['/clinic/info', '/doctors']) await reloaded.read(path, { get: s.get })
  assert.equal(s.calls(), 2)
  s.advance(PUBLIC_PAGE_TTL_MS)
  for (const path of ['/clinic/info', '/doctors']) await reloaded.read(path, { get: s.get })
  assert.equal(s.calls(), 4)
})

test('cache entries cannot cross clinic origins or API configurations', async () => {
  const s = setup()
  const first = await s.cache.read('/clinic/info', { get: s.get })
  s.site('https://beta.example|same-origin')
  const second = await s.cache.read('/clinic/info', { get: s.get })
  s.site('https://beta.example|https://new-api.example')
  await s.cache.read('/clinic/info', { get: s.get })
  assert.notEqual(first.id, second.id)
  assert.equal(s.calls(), 3)
})

test('slots, booking writes, auth, payments and private dashboard data are never cached', async () => {
  const s = setup()
  for (const path of ['/doctors/d1/slots', '/appointments/book', '/auth/verify', '/admin/stats', '/admin/billing', '/doctors?date=2026-10-19']) {
    await assert.rejects(s.cache.read(path, { get: s.get }), /Only public/)
  }
  assert.equal(s.calls(), 0)
})

test('failed and malformed responses are not saved and a later retry succeeds', async () => {
  const s = setup()
  for (const get of [async () => { throw new Error('offline') }, async () => ({ data: '<html>Starting</html>' })]) {
    await assert.rejects(s.cache.read('/clinic/info', { get }))
    assert.equal(s.entries.size, 0)
  }
  await assert.rejects(s.cache.read('/doctors', { get: async () => ({ data: { data: [null] } }) }))
  assert.equal(s.entries.size, 0)
  assert.equal((await s.cache.read('/clinic/info', { get: s.get })).name, 'Clinic')
})

test('concurrent subscribers share one read and cancelling one does not cancel the other', async () => {
  const s = setup()
  let complete, calls = 0
  const get = () => { calls++; return new Promise(resolve => { complete = resolve }) }
  const controller = new AbortController()
  const first = s.cache.read('/clinic/info', { get, signal: controller.signal })
  const cancelled = assert.rejects(first, error => error.code === 'ERR_CANCELED')
  controller.abort()
  const second = s.cache.read('/clinic/info', { get })
  await Promise.resolve()
  complete({ data: { data: { id: 'clinic' } } })
  await cancelled
  assert.equal((await second).id, 'clinic')
  assert.equal(calls, 1)
  assert.equal((await s.cache.read('/clinic/info', { get })).id, 'clinic')
  assert.equal(calls, 1)
})

test('explicit retry bypasses a fresh cache; admin invalidation removes both public resources', async () => {
  const s = setup()
  await s.cache.read('/clinic/info', { get: s.get })
  await s.cache.read('/doctors', { get: s.get })
  await s.cache.read('/clinic/info', { get: s.get, force: true })
  assert.equal(s.calls(), 3)
  s.cache.invalidate()
  assert.equal(s.entries.size, 0)
  await s.cache.read('/clinic/info', { get: s.get })
  await s.cache.read('/doctors', { get: s.get })
  assert.equal(s.calls(), 5)
})

test('a response started before invalidation cannot overwrite newer public data', async () => {
  const s = setup()
  let complete
  const old = s.cache.read('/clinic/info', { get: () => new Promise(resolve => { complete = resolve }) })
  await Promise.resolve()
  s.cache.invalidate()
  const updated = await s.cache.read('/clinic/info', { get: s.get })
  complete({ data: { data: { id: 'old', name: 'Old clinic' } } })
  await old
  assert.deepEqual(await s.cache.read('/clinic/info', { get: s.get }), updated)
})

test('public cache omits unexpected private top-level fields', async () => {
  const s = setup()
  const clinic = await s.cache.read('/clinic/info', { get: async () => ({ data: { data: { id: 'a', name: 'Clinic', owner_email: 'private', subscription_active: true, token: 'private' } } }) })
  const doctors = await s.cache.read('/doctors', { get: async () => ({ data: { data: [{ id: 'd', full_name: 'Doctor', password: 'private', email: 'private' }] } }) })
  assert.deepEqual(clinic, { id: 'a', name: 'Clinic' })
  assert.deepEqual(doctors, [{ id: 'd', full_name: 'Doctor' }])
  assert.ok(![...s.entries.values()].join('').includes('private'))
})

test('blocked browser storage still supports in-memory caching and expiry', async () => {
  const s = setup()
  const cache = createPublicPageCache({ ...s.options, storage: () => { throw new Error('Blocked') } })
  await cache.read('/clinic/info', { get: s.get })
  await cache.read('/clinic/info', { get: s.get })
  assert.equal(s.calls(), 1)
  s.advance(PUBLIC_PAGE_TTL_MS)
  await cache.read('/clinic/info', { get: s.get })
  assert.equal(s.calls(), 2)
})

test('corrupt entries and clock rollback cannot extend cache lifetime', async () => {
  const s = setup()
  await s.cache.read('/clinic/info', { get: s.get })
  const key = [...s.entries.keys()][0]
  s.entries.set(key, JSON.stringify({ savedAt: 1000, data: { missingId: true } }))
  await s.cache.read('/clinic/info', { get: s.get })
  s.advance(-1)
  await s.cache.read('/clinic/info', { get: s.get })
  assert.equal(s.calls(), 3)
})

test('a full storage quota falls back to memory without repeating the API request', async () => {
  const s = setup()
  const cache = createPublicPageCache({ ...s.options, storage: () => ({
    getItem: () => null,
    removeItem: () => {},
    setItem: () => { throw new Error('Quota exceeded') },
  }) })
  await cache.read('/clinic/info', { get: s.get })
  await cache.read('/clinic/info', { get: s.get })
  assert.equal(s.calls(), 1)
})

test('only successful relevant admin writes qualify for public cache invalidation', () => {
  for (const url of ['/admin/clinic/branding', '/admin/clinic/settings', '/admin/doctors', '/admin/doctors/d1/toggle', '/admin/doctors/d1/schedule']) {
    assert.equal(isPublicPageMutation({ method: 'patch', url }), true)
    assert.equal(isPublicPageMutation({ method: 'get', url }), false)
  }
  assert.equal(isPublicPageMutation({ method: 'post', url: '/admin/login' }), false)
  assert.equal(isPublicPageMutation({ method: 'post', url: '/appointments/book' }), false)
})
