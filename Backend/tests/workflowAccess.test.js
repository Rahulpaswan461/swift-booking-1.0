import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import jwt from 'jsonwebtoken'
const result = () => ({status(code){this.code=code;return this},json(data){this.data=data;return this}})
let doctorResult={data:{id:'doctor',is_active:true}}
globalThis.__workflowAuth={jwt,db:{from(){const q={then(resolve){return Promise.resolve(doctorResult).then(resolve)}};for(const op of ['select','eq','maybeSingle'])q[op]=()=>q;return q}}}
const source=(await readFile(new URL('../middleware/auth.js',import.meta.url),'utf8')).replace(/^import .*$/gm,'')
const auth=await import(`data:text/javascript;base64,${Buffer.from('const {jwt,db:supabase}=globalThis.__workflowAuth;\n'+source).toString('base64')}`)
process.env.JWT_SECRET='isolated-workflow-test-secret'
const request=claims=>({headers:{authorization:`Bearer ${jwt.sign(claims,process.env.JWT_SECRET)}`},tenant:{id:'clinic'},path:'/appointments'})
test('patient routes accept only the verified patient and matching clinic',async()=>{
  for(const claims of [{role:'admin',id:'admin',clinic_id:'clinic'},{patient_id:'p',clinic_id:'other'},{patient_id:'p'}]){
    const res=result();await auth.protect(request(claims),res,()=>assert.fail('must not authorize'));assert.equal(res.code,401)
  }
  let passed=false;await auth.protect(request({patient_id:'p',clinic_id:'clinic'}),result(),()=>passed=true);assert.equal(passed,true)
})
test('a disabled doctor loses HTTP access immediately; database outage remains retryable',async()=>{
  const req=request({role:'doctor',id:'doctor',clinic_id:'clinic'})
  doctorResult={data:{is_active:false}};let res=result();await auth.protectDoctor(req,res,()=>assert.fail());assert.equal(res.code,403)
  doctorResult={error:{code:'08006'}};res=result();await auth.protectDoctor(req,res,()=>assert.fail());assert.equal(res.code,503)
  doctorResult={data:{is_active:true}};let passed=false;await auth.protectDoctor(req,result(),()=>passed=true);assert.equal(passed,true)
})
