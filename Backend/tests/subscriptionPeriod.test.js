import test from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionPeriod } from '../services/subscriptionPeriod.js'
const now = '2026-10-08T12:00:00Z'
test('a last-month active row expires at the Dodo renewal boundary', () => {
  assert.equal(subscriptionPeriod({status:'active',next_billing_date:'2026-10-01T00:00:00Z'}, now).status, 'expired')
})
test('renewed subscriptions stay active through the current paid period', () => {
  assert.equal(subscriptionPeriod({status:'active',next_billing_date:'2026-11-01T00:00:00Z'}, now).active, true)
})
test('expiry is inclusive and an explicit earlier end overrides renewal', () => {
  assert.equal(subscriptionPeriod({status:'active',next_billing_date:now}, now).active, false)
  assert.equal(subscriptionPeriod({status:'active',ends_at:'2026-10-01',next_billing_date:'2026-11-01'}, now).active, false)
})
test('missing, malformed, and inactive periods never unlock paid features', () => {
  for (const subscription of [null,{status:'active'}, {status:'active',next_billing_date:'bad'}, {status:'cancelled',next_billing_date:'2026-11-01'}]) assert.equal(subscriptionPeriod(subscription,now).active,false)
})

import { createStaffAuthenticator } from '../realtime/auth.js'
import jwt from 'jsonwebtoken'
test('paid socket access uses renewal dates and rejects expired and unverifiable periods', async () => {
 const secret='period-test-secret'
 const token=jwt.sign({id:'staff',role:'admin',clinic_id:'clinic'},secret,{expiresIn:'1h'})
 const db={from:()=>{const query={select:()=>query,eq:()=>query,single:async()=>({data:{id:'staff',clinic_id:'clinic'}})};return query}}
 for(const [period,allowed] of [[{status:'active',next_billing_date:'2099-01-01'},true],[{status:'active',next_billing_date:'2020-01-01'},false],[{status:'active'},false]]) {
  const auth=createStaffAuthenticator({secret,db,earlyAccess:false,loadSubscription:async()=>({clinic:{is_active:true},subscription:period})})
  if(allowed)assert.equal((await auth(token)).role,'admin');else await assert.rejects(auth(token),e=>e.code==='forbidden' && e.reason === (period.next_billing_date ? 'subscription_expired' : 'subscription_required'))
 }
})

import { readFile } from 'node:fs/promises'
import { entitlementsFor } from '../config/plans.js'
test('billing response reflects expired periods and surfaces lookup outages',async()=>{
 let responses=[]
 globalThis.__billingDb={from(){const q={then(resolve,reject){return Promise.resolve(responses.shift()).then(resolve,reject)}};for(const m of ['select','eq','order','limit','single'])q[m]=()=>q;return q}}
 globalThis.__billingPeriod=subscriptionPeriod;globalThis.__billingEntitlements=entitlementsFor
 const source=await readFile(new URL('../controllers/clinicController.js',import.meta.url),'utf8')
 const handler=source.slice(source.indexOf('export const getMyClinic'),source.indexOf('/**\n * Resolve clinic',source.indexOf('export const getMyClinic')))
 const {getMyClinic}=await import(`data:text/javascript;base64,${Buffer.from('const supabase=globalThis.__billingDb;const subscriptionPeriod=globalThis.__billingPeriod;const entitlementsFor=globalThis.__billingEntitlements;const EARLY_ACCESS=false;const buildClinicUrl=()=>"test";\n'+handler).toString('base64')}`)
 const run=async(sub,error)=>{responses=[{data:{id:'clinic',subscription_plan:'growth'}},{data:sub?[sub]:[],error}];const res={status(code){this.code=code;return this},json(body){this.body=body;return this}};await getMyClinic({admin:{clinic_id:'clinic'}},res);return res}
 const expired=await run({plan:'growth',status:'active',next_billing_date:'2020-01-01'})
 assert.equal(expired.body.data.subscription_active,false);assert.equal(expired.body.data.subscription_status,'expired');assert.equal(expired.body.data.subscription_plan,null);assert.equal(expired.body.data.entitlements.features.customBranding,false)
 const renewed=await run({plan:'growth',status:'active',next_billing_date:'2099-01-01'});assert.equal(renewed.body.data.subscription_active,true);assert.equal(renewed.body.data.entitlements.features.customBranding,true)
 assert.equal((await run(null,{code:'08006'})).code,503)
})

test('a payment event without a renewal date preserves the known paid period',async()=>{
 const source=await readFile(new URL('../services/dodoPayments.js',import.meta.url),'utf8')
 const handler=source.slice(source.indexOf('export async function activateClinicSubscription'),source.indexOf('/**\n * Record a single charge',source.indexOf('export async function activateClinicSubscription')))
 let writes=[]
 globalThis.__activationDb={from(){const q={then(resolve,reject){return Promise.resolve({data:[{next_billing_date:'2099-01-01'}]}).then(resolve,reject)}};for(const m of ['select','eq','limit','update','neq'])q[m]=()=>q;return q}}
 globalThis.__activationWrite=async(table,column,id,record)=>{writes.push(record);return {error:null}}
 const {activateClinicSubscription}=await import(`data:text/javascript;base64,${Buffer.from('const supabase=globalThis.__activationDb;const subscriptionPeriod=globalThis.__billingPeriod;const upsertByProviderId=globalThis.__activationWrite;const invalidateSubscriptionCache=()=>{};const fetchSubscription=async()=>({});\n'+handler).toString('base64')}`)
 const result=await activateClinicSubscription({clinicId:'clinic',plan:'growth',providerSubId:'sub',nextBillingDate:null,eventType:'payment.succeeded'})
 assert.equal(result.active,true);assert.equal(Object.hasOwn(writes[0],'next_billing_date'),false)
 const renewed=await activateClinicSubscription({clinicId:'clinic',plan:'growth',providerSubId:'sub',nextBillingDate:'2099-02-01',eventType:'subscription.renewed'})
 assert.equal(renewed.active,true);assert.equal(writes[1].next_billing_date,'2099-02-01')
})

test('HTTP access rejects expired renewal dates and tells admins to review billing',async()=>{
 let responses=[]
 globalThis.__httpPeriodDb={from(){const q={then(resolve,reject){return Promise.resolve(responses.shift()).then(resolve,reject)}};for(const m of ['select','eq','maybeSingle','order','limit'])q[m]=()=>q;return q}}
 const source=(await readFile(new URL('../middleware/tenant.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'').replace(/^export \{ EARLY_ACCESS \}.*$/gm,'')
 const {enforceSubscription,invalidateSubscriptionCache}=await import(`data:text/javascript;base64,${Buffer.from('const supabase=globalThis.__httpPeriodDb;const EARLY_ACCESS=false;const planConfig=()=>({});const subscriptionPeriod=globalThis.__billingPeriod;\n'+source).toString('base64')}`)
 for(const [date,allowed] of [['2099-01-01',true],['2020-01-01',false]]) {
  invalidateSubscriptionCache();responses=[{data:{id:'clinic',is_active:true}},{data:[{plan:'growth',status:'active',next_billing_date:date}]}];let passed=false
  const req={admin:{clinic_id:'clinic'}};const res={status(code){this.code=code;return this},json(body){this.body=body;return this}}
  await enforceSubscription(req,res,()=>{passed=true});assert.equal(passed,allowed)
  if(!allowed){assert.equal(res.code,403);assert.equal(res.body.subscription_expired,true);assert.equal(res.body.subscription_required,true)}
 }
})
