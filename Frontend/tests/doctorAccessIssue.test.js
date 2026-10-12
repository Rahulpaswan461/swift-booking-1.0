import test from 'node:test'
import assert from 'node:assert/strict'
import { doctorAccessIssue } from '../src/utils/doctorAccessIssue.js'
test('subscription expiry gives one actionable clinic renewal message without a sign-in link',()=>{
 for (const input of [{liveStatus:'forbidden',socketReason:'subscription_expired'},{liveStatus:'forbidden',errorDetails:{subscription_expired:true,subscription_required:true}}]) {
  const issue=doctorAccessIssue(input);assert.match(issue.title,/subscription has expired/);assert.match(issue.message,/clinic administrator to renew/);assert.equal(issue.signIn,undefined)
 }
})
test('session expiry and inactive accounts have distinct recovery actions',()=>{
 assert.equal(doctorAccessIssue({liveStatus:'expired'}).signIn,true)
 assert.match(doctorAccessIssue({liveStatus:'forbidden',socketReason:'account_inactive'}).message,/reactivate/)
 assert.equal(doctorAccessIssue({liveStatus:'live'}),null)
})
