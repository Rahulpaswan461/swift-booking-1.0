import test from 'node:test'
import assert from 'node:assert/strict'
import { createCachedLoader } from '../utils/cachedLoader.js'

test('concurrent requests share a load and then use the cached result', async () => {
  let calls = 0
  let resolve
  const loader = createCachedLoader(() => { calls++; return new Promise(r => { resolve = r }) })
  const first = loader('clinic')
  const second = loader('clinic')
  await Promise.resolve()
  assert.equal(calls, 1)
  resolve({ total: 1200 })
  assert.deepEqual(await first, await second)
  assert.deepEqual(await loader('clinic'), { total: 1200 })
  assert.equal(calls, 1)
})

test('failed loads are retried instead of caching an empty dashboard', async () => {
  let calls = 0
  const loader = createCachedLoader(async () => {
    if (++calls === 1) throw new Error('database unavailable')
    return 42
  })
  await assert.rejects(loader(), /database unavailable/)
  assert.equal(await loader(), 42)
})

test('bounded cache evicts an older key and respects expiry', async () => {
  let calls = 0
  const loader = createCachedLoader(async key => { calls++; return key }, { maxEntries: 1 })
  await loader('one'); await loader('two'); await loader('one')
  assert.equal(calls, 3)
  const uncached = createCachedLoader(async () => ++calls, { ttlMs: 0 })
  assert.notEqual(await uncached(), await uncached())
})

test('invalidating an in-flight load cannot overwrite or evict a newer cached value', async () => {
  const resolvers = []
  const loader = createCachedLoader(() => new Promise(resolve => resolvers.push(resolve)))
  const old = loader('doctor')
  await Promise.resolve()
  loader.invalidate('doctor')
  const fresh = loader('doctor')
  await Promise.resolve()
  resolvers[1]('new')
  assert.equal(await fresh, 'new')
  resolvers[0]('old')
  assert.equal(await old, 'old')
  assert.equal(await loader('doctor'), 'new')
})
