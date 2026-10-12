import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { dodoConfig } from '../config/dodo.js'
import { verifyDodoSignature } from '../services/dodoWebhookSignature.js'

test('original variables work for test and live deployments', () => {
  for (const mode of ['test', 'live']) {
    const config = dodoConfig({
      DODO_API_BASE: `https://${mode}.dodopayments.com`,
      DODO_API_KEY: ` ${mode}-key `,
      DODO_WEBHOOK_SECRET: `${mode}-hook`,
      DODO_PRODUCT_BASIC: `pdt_${mode}`,
    })
    assert.equal(config.environment, mode)
    assert.equal(config.apiKey, `${mode}-key`)
    assert.equal(config.webhookSecret, `${mode}-hook`)
    assert.equal(config.products.basic, `pdt_${mode}`)
  }
})
test('defaults to test and ignores obsolete scoped settings', () => {
  const scoped = { DODO_TEST_API_KEY: 'old-test', DODO_LIVE_API_KEY: 'old-live', DODO_TEST_WEBHOOK_SECRET: 'old-hook', DODO_TEST_PRODUCT_BASIC: 'old-product' }
  const config = dodoConfig({ ...scoped, DODO_API_KEY: 'active', DODO_WEBHOOK_SECRET: 'active-hook', DODO_PRODUCT_BASIC: 'active-product' })
  assert.equal(config.environment, 'test')
  assert.equal(config.apiKey, 'active')
  assert.equal(config.webhookSecret, 'active-hook')
  assert.equal(config.products.basic, 'active-product')
  assert.equal(dodoConfig(scoped).apiKey, '')
  assert.equal(dodoConfig(scoped).webhookSecret, '')
  assert.equal(dodoConfig(scoped).products.basic, '')
})
test('invalid and product checkout URLs are rejected', () => {
  for(const url of ['https://checkout.dodopayments.com/buy/pdt_test','https://unknown.example','http://test.dodopayments.com']) assert.throws(()=>dodoConfig({DODO_API_BASE:url}),{code:'payment_environment_invalid'})
})

test('webhooks accept only the selected environment secret and reject replays', t => {
  const saved = Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('DODO_')))
  for(const key of Object.keys(process.env).filter(key=>key.startsWith('DODO_'))) delete process.env[key]
  t.after(()=>{
    for(const key of Object.keys(process.env).filter(key=>key.startsWith('DODO_'))) delete process.env[key]
    Object.assign(process.env,saved)
  })
  const secrets={test:Buffer.from('test-signing-key').toString('base64'),live:Buffer.from('live-signing-key').toString('base64')}
  const body=JSON.stringify({type:'payment.succeeded',data:{metadata:{clinic_id:'clinic'}}})
  const headers=(mode,age=0)=>{
    const id='event-example',time=String(Math.floor(Date.now()/1000)-age)
    const sig=crypto.createHmac('sha256',Buffer.from(secrets[mode],'base64')).update(`${id}.${time}.${body}`).digest('base64')
    return {'webhook-id':id,'webhook-timestamp':time,'webhook-signature':`v1,${sig}`}
  }
  for(const mode of ['test','live']) {
    process.env.DODO_API_BASE=`https://${mode}.dodopayments.com`
    process.env.DODO_WEBHOOK_SECRET=`whsec_${secrets[mode]}`
    assert.equal(verifyDodoSignature(body,headers(mode)),true)
    assert.equal(verifyDodoSignature(body,headers(mode==='test'?'live':'test')),false)
    assert.equal(verifyDodoSignature(body,headers(mode,360)),false)
    assert.equal(verifyDodoSignature(body+' ',headers(mode)),false)
  }
})
