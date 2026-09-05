import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {issue,verify} from '../lib/passiton/proofs.js';
import {validateAssessment,assess} from '../lib/passiton/intelligence.js';
import {source,sourceVersion,bounty} from '../lib/passiton/catalog.js';
import {validatePayment,memoFor} from '../lib/passiton/payments.js';
import {sql} from '../lib/passiton/warehouse.js';
import {createPassitonRouter} from '../lib/passiton/routes.js';
const good={status:'ready',claims:[{text:'Apply with the latest marksheet and upload final results by 30 September 2026.',sectionId:'S2',quote:source.sections[1].text}],issues:[],followUp:'Please ask a person to review this explanation.'};
test('model citations must be actual source excerpts and a ready check cannot contain issues',()=>{
 assert.equal(validateAssessment(good).status,'ready');
 assert.throws(()=>validateAssessment({...good,claims:[{...good.claims[0],quote:'Students may submit final results after October.'}]}));
 assert.throws(()=>validateAssessment({...good,issues:['The date is wrong.']}));
 assert.throws(()=>validateAssessment({...good,claims:[]}));
 assert.throws(()=>validateAssessment({...good,status:'approved'}));
});
test('an altered or expired review token cannot authorize a different answer',()=>{
 const token=issue('review',{id:'one',sourceVersion});assert.equal(verify(token,'review').id,'one');
 assert.throws(()=>verify(token,'check'));
 const [body,sig]=token.split('.');const data=JSON.parse(Buffer.from(body,'base64url'));data.data.id='two';
 assert.throws(()=>verify(Buffer.from(JSON.stringify(data)).toString('base64url')+'.'+sig,'review'));
 assert.throws(()=>verify(issue('review',{id:'expired'},-1),'review'));
});
test('provider rate limits fail closed without pretending the contribution passed',async()=>{
 await assert.rejects(()=>assess({question:'Example?',language:'en',text:'Some text'},{fetch:async()=>({ok:false,status:429})}),err=>err.status===429);
});
test('SQL API uses bound values and polls asynchronous results without exposing tokens',async()=>{
 const calls=[];const result=await sql('SELECT ? value',["x'; DROP TABLE example;--"],{auth:{token:'test-only',type:'KEYPAIR_JWT'},fetch:async(url,opts)=>{calls.push({url,opts});return calls.length===1?{ok:true,status:202,json:async()=>({statementStatusUrl:'/api/v2/statements/abc-123'})}:{ok:true,status:200,json:async()=>({code:'090001',statementHandle:'abc-123',resultSetMetaData:{rowType:[{name:'VALUE'}]},data:[['safe']]})};}});
 assert.equal(calls.length,2);assert.equal(JSON.parse(calls[0].opts.body).bindings[1].value,"x'; DROP TABLE example;--");assert.equal(result.rows[0].value,'safe');
 await assert.rejects(()=>sql('SELECT 1',[],{auth:{token:'test',type:'KEYPAIR_JWT'},fetch:async()=>({ok:true,status:202,json:async()=>({statementStatusUrl:'https://evil.example/exfiltrate'})})}));
});
const payer='39XuYz23dvGrZwVxLywKuXLhCHezMnQuF9jhLx3vS3ws',memo=memoFor('contribution');
function tx(){return {slot:1,blockTime:100,meta:{err:null},transaction:{message:{accountKeys:[{pubkey:payer,signer:true}],instructions:[{program:'system',parsed:{type:'transfer',info:{source:payer,destination:bounty.recipient,lamports:bounty.lamports}}},{programId:'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',parsed:memo}]}}};}
test('bounties require the exact transfer, signer and memo; failed or unrelated payments fail',()=>{
 assert.equal(validatePayment(tx(),{memo,payer}).lamports,bounty.lamports);
 for(const mutate of [t=>t.meta.err='failed',t=>t.transaction.message.instructions[0].parsed.info.lamports++,t=>t.transaction.message.instructions[1].parsed='other',t=>t.transaction.message.accountKeys[0].signer=false,t=>t.transaction.message.instructions[0].parsed.info.destination=payer]){const t=tx();mutate(t);assert.throws(()=>validatePayment(t,{memo,payer}));}
});
test('HTTP contribution loop rejects failed checks, missing human confirmation and cross-session proofs',async()=>{
 const events=[];const app=express();app.use(express.json({limit:'40kb'}));app.use(createPassitonRouter({assess:async({text})=>text.includes('wrong')?validateAssessment({status:'needs_revision',claims:[],issues:['The date conflicts with S2.'],followUp:'What does S2 say?'}):validateAssessment(good),recordEvent:async event=>{events.push(event);return {source:'test',saved:true};}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,session)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(session?{'X-Passiton-Session':session}:{})},body:JSON.stringify(body)});
 try{
 const session=(await (await post('/session',{})).json()).token;
 assert.equal((await post('/check',{questionId:'provisional',language:'en',text:'A sample answer'})).status,400);
 const bad=await (await post('/check',{questionId:'provisional',language:'en',text:'An intentionally wrong answer'},session)).json();
 assert.equal((await post('/review',{checkToken:bad.checkToken,confirmedSource:true,confirmedDemo:true},session)).status,409);
 const checked=await (await post('/check',{questionId:'provisional',language:'en',text:'Apply with your latest available marksheet and upload final results by 30 September 2026.'},session)).json();
 assert.equal((await post('/review',{checkToken:checked.checkToken},session)).status,400);
 const other=(await (await post('/session',{})).json()).token;
 assert.equal((await post('/review',{checkToken:checked.checkToken,confirmedSource:true,confirmedDemo:true},other)).status,400);
 const reviewed=await (await post('/review',{checkToken:checked.checkToken,confirmedSource:true,confirmedDemo:true},session)).json();
 assert.equal(reviewed.review.reviewMode,'demo-role');assert.equal(verify(reviewed.reviewToken,'review').id,checked.id);
 assert.equal(events.filter(e=>e.type==='review').length,1);assert.ok(!events.find(e=>e.type==='check').text);
 assert.equal((await post('/payment/prepare',{reviewToken:checked.checkToken,payer},session)).status,400);
 assert.equal((await post('/review/sync',{reviewToken:reviewed.reviewToken},other)).status,400);
 assert.equal((await post('/review/sync',{reviewToken:checked.checkToken},session)).status,400);
 const synced=await (await post('/review/sync',{reviewToken:reviewed.reviewToken},session)).json();
 assert.equal(synced.id,checked.id);assert.equal(synced.storage.saved,true);
 assert.equal(events.filter(e=>e.type==='review').at(-1).id,`review:${checked.id}`);

 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('ready audio falls back to cited claims and a temporary voice failure can be retried',async()=>{
 const spoken=[];const app=express();app.use(express.json());app.use(createPassitonRouter({speakChecked:async text=>{spoken.push(text);if(spoken.length===1)throw new Error('Temporary provider failure');return {source:'elevenlabs',url:'data:audio/mpeg;base64,AAAA'};}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
 const session=issue('session',{id:'voice-test'}),token=issue('check',{sessionId:'voice-test',sourceVersion,result:{...good,followUp:''}});
 const speak=()=>fetch(base+'/speak',{method:'POST',headers:{'content-type':'application/json','X-Passiton-Session':session},body:JSON.stringify({kind:'check',token})});
 assert.equal((await speak()).status,502);assert.equal((await speak()).status,200);
 assert.deepEqual(spoken,[good.claims[0].text,good.claims[0].text]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
