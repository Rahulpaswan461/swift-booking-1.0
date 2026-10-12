import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { emailLookup } from '../utils/emailLookup.js'
const results=[],queries=[]
const db={from(table){const calls=[];queries.push({table,calls});const q={then(resolve,reject){assert.ok(results.length,'unexpected database query');return Promise.resolve(results.shift()).then(resolve,reject)}};for(const op of ['select','eq','ilike','limit','single','maybeSingle','insert','delete'])q[op]=(...args)=>{calls.push([op,...args]);return q};return q}}
globalThis.__launch={db,emailLookup}
const source=(await readFile(new URL('../controllers/clinicController.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'')
const prelude=`const {db:supabase,emailLookup}=globalThis.__launch; const bcrypt={hash:async()=>"hashed"};const jwt={sign:()=>"token"};const buildClinicUrl=slug=>"https://"+slug+".example.com";`
const {registerClinic}=await import(`data:text/javascript;base64,${Buffer.from(prelude+source).toString('base64')}`)
const response=()=>({status(code){this.code=code;return this},json(body){this.body=body;return this}})
const req={body:{name:'Sample Clinic',slug:'sample-clinic',ownerEmail:' Owner@Example.com ',password:'sample-only-password'}}
test('clinic registration normalizes addresses and creates a linked unpaid clinic/admin',async()=>{
 queries.length=0;results.push({data:null},{data:null},{data:{id:'c',slug:'sample-clinic',name:'Sample Clinic'}},{data:{id:'a',clinic_id:'c',email:'owner@example.com'}})
 const res=response();await registerClinic(req,res);assert.equal(res.code,201);assert.equal(queries[3].calls.find(c=>c[0]==='insert')[1].clinic_id,'c');assert.equal(results.length,0)
 assert.deepEqual(queries[1].calls.find(c=>c[0]==='ilike'),['ilike','email','owner@example.com'])
 assert.equal(queries[2].calls.find(c=>c[0]==='insert')[1].subscription_plan,null)
})
test('failed admin creation removes only a newly created clinic with no linked admin',async()=>{
 queries.length=0;results.push({data:null},{data:null},{data:{id:'new-c'}},{error:{code:'23505'}},{data:[]},{error:null})
 const res=response();await registerClinic(req,res);assert.equal(res.code,409)
 const deletion=queries.find(q=>q.calls.some(c=>c[0]==='delete'));assert.equal(deletion.table,'clinics');assert.deepEqual(deletion.calls.find(c=>c[0]==='eq'),['eq','id','new-c']);assert.equal(results.length,0)
})
test('ambiguous admin creation never deletes a clinic that already has an admin',async()=>{
 queries.length=0;results.push({data:null},{data:null},{data:{id:'new-c'}},{error:{code:'08006'}},{data:[{id:'saved-admin'}]})
 const res=response();await registerClinic(req,res);assert.equal(res.code,500);assert.equal(queries.some(q=>q.calls.some(c=>c[0]==='delete')),false);assert.equal(results.length,0)
})
test('email matching escapes wildcard characters while preserving mixed-case account compatibility',()=>{
 assert.equal(emailLookup(' A_B%tag@Example.com '),'a\\_b\\%tag@example.com')
})
test('payment verification cannot attach unowned or another clinic’s subscriptions',async()=>{
 const text=await readFile(new URL('../services/dodoPayments.js',import.meta.url),'utf8')
 const handler=text.slice(text.indexOf('export async function verifyAndActivateSubscription'),text.indexOf('/** Postgres unique-constraint'))
 for(const metadata of [undefined,{clinic_id:'other',plan:'growth'}]){
  globalThis.__providerSub={status:'active',metadata};let writes=0;globalThis.__activate=async()=>{writes++;return {active:true}}
  const module=await import(`data:text/javascript;base64,${Buffer.from(`const fetchSubscription=async()=>globalThis.__providerSub; const ACTIVE_SUB_STATUSES=new Set(['active']);const activateClinicSubscription=globalThis.__activate;\n${handler}\n//${JSON.stringify(metadata)}`).toString('base64')}`)
  await assert.rejects(module.verifyAndActivateSubscription('sub','clinic'),/does not belong/);assert.equal(writes,0)
 }
})
const doctorSource=(await readFile(new URL('../controllers/doctorManagement.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'')
const {createDoctorForClinic}=await import(`data:text/javascript;base64,${Buffer.from(prelude+'\nconst generateTempPassword=()=>"temporary";const sendWelcomeEmail=async()=>{};\n'+doctorSource).toString('base64')}`)
test('doctor creation uses the authenticated clinic and rejects non-finite consultation fees',async()=>{
 const req={admin:{clinic_id:'owned'},body:{fullName:'Sample Doctor',specialization:'General Medicine',email:' Doctor@Example.com ',consultationFee:'Infinity',clinic_id:'unowned'}}
 const bad=response();await createDoctorForClinic(req,bad);assert.equal(bad.code,400)
 queries.length=0;req.body.consultationFee=500;results.push({data:{id:'owned',slug:'sample'}},{data:null},{data:{id:'d',full_name:'Sample Doctor',email:'doctor@example.com',clinic_id:'owned'}})
 const res=response();await createDoctorForClinic(req,res);assert.equal(res.code,201)
 const row=queries[2].calls.find(c=>c[0]==='insert')[1];assert.equal(row.clinic_id,'owned');assert.equal(row.email,'doctor@example.com');assert.equal(row.consultation_fee,500);assert.equal(results.length,0)
})
