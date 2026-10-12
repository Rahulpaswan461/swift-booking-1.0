import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefreshQueue } from '../src/utils/refreshQueue.js'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

test('a burst results in one read; an event during that read produces exactly one follow-up', async () => {
  let calls = 0, inFlight = 0, peak = 0
  const resolves = []
  const queue = createRefreshQueue(async () => {
    calls++; inFlight++; peak = Math.max(peak, inFlight)
    await new Promise(resolve => resolves.push(resolve))
    inFlight--
  }, 5)
  try {
    for (let i = 0; i < 20; i++) queue.request()
    await delay(20)
    assert.equal(calls, 1)
    for (let i = 0; i < 20; i++) queue.request()
    resolves[0]()
    await delay(20)
    assert.equal(calls, 2)
    assert.equal(peak, 1)
    resolves[1]()
    await delay(20)
    assert.equal(calls, 2)
  } finally { queue.stop() }
})

test('changing date or unmounting cancels pending work', async () => {
  let calls = 0
  const queue = createRefreshQueue(async () => calls++, 5)
  queue.request()
  queue.stop()
  await delay(20)
  assert.equal(calls, 0)
})

test('a transient API failure recovers without another socket event', async () => {
  let calls = 0
  const queue = createRefreshQueue(async () => {
    if (++calls < 3) throw new Error('Temporary network failure')
  }, 1, { shouldRetry: () => true, retryDelays: [5, 10] })
  try {
    queue.request(true)
    await delay(60)
    assert.equal(calls, 3)
    await delay(30)
    assert.equal(calls, 3)
  } finally { queue.stop() }
})

test('retries stop on cleanup and make no reads while hidden', async () => {
  let calls = 0
  const queue = createRefreshQueue(async () => { calls++; throw new Error('offline') }, 1,
    { shouldRetry: () => true, canRetry: () => false, retryDelays: [5] })
  queue.request(true)
  await delay(20)
  assert.equal(calls, 1)
  queue.request(true)
  queue.stop()
  await delay(20)
  assert.equal(calls, 1)
})
