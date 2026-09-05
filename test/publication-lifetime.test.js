import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {issue,verify} from '../lib/passiton/proofs.js';
import {createPassitonRouter} from '../lib/passiton/routes.js';
import {source,sourceVersion} from '../lib/passiton/catalog.js';

test('published answers remain readable and speakable after action expiry, without authorizing payment or sync',async t=>{
  const start=Date.now();
  t.mock.timers.enable({apis:['Date'],now:start});
  const review={sessionId:'contributor',id:'published-answer',sourceVersion,questionId:'provisional',language:'en',reviewMode:'demo-role',reviewedAt:start,claims:[{text:'Apply with your latest marksheet.',sectionId:'S2',quote:source.sections[1].text}]};
  const token=issue('review',review,7*86400);
  const oldSource=issue('review',{...review,sourceVersion:'old'},7*86400);
  const wrongLanguage=issue('review',{...review,language:'hi'},7*86400);
  const wrongTopic=issue('review',{...review,questionId:'documents'},7*86400);
  const wrongKind=issue('check',review,7*86400);
  const [body,signature]=token.split('.');
  const forged=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(body,'base64url')),data:{...review,id:'forged'}})).toString('base64url')+'.'+signature;
  t.mock.timers.tick(40*86400*1000);
  assert.throws(()=>verify(token,'review'));
  const spoken=[];let paymentLookups=0,writes=0;
  const app=express();app.use(express.json());app.use(createPassitonRouter({
    warehouseConfigured:()=>true,
    sql:async(_query,bindings)=>{assert.deepEqual(bindings,['provisional','en',sourceVersion]);return {rows:[token,oldSource,wrongLanguage,wrongTopic,wrongKind,forged].map(token=>({token})),statementHandle:'fixture'};},
    speakChecked:async text=>{spoken.push(text);return {source:'elevenlabs',url:'data:audio/mpeg;base64,AAAA'};},
    findPayment:async()=>{paymentLookups++;throw new Error('Payment lookup must not be reached');},
    recordEvent:async()=>{writes++;return {saved:true};}
  }));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const session=issue('session',{id:'contributor'});
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json','X-Passiton-Session':session},body:JSON.stringify(body)});
  try{
    const response=await fetch(base+'/knowledge/provisional/en');assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.answers.length,1);
    const answer=data.answers[0];assert.equal(answer.answer.id,review.id);assert.equal(answer.reviewToken,undefined);
    assert.equal(verify(answer.readingToken,'reading').id,review.id);
    assert.throws(()=>verify(answer.readingToken,'review'));
    assert.equal((await post('/speak',{kind:'reading',token:answer.readingToken})).status,200);
    assert.deepEqual(spoken,[review.claims[0].text]);
    for(const proof of [token,answer.readingToken]){
      assert.equal((await post('/review/sync',{reviewToken:proof})).status,400);
      assert.equal((await post('/payment/prepare',{reviewToken:proof,payer:'39XuYz23dvGrZwVxLywKuXLhCHezMnQuF9jhLx3vS3ws'})).status,400);
    }
    assert.equal(writes,0);assert.equal(paymentLookups,0);
    assert.equal((await post('/speak',{kind:'reading',token})).status,400);
    t.mock.timers.tick(3601*1000);
    assert.equal((await post('/speak',{kind:'reading',token:answer.readingToken})).status,400);
    const refreshed=await (await fetch(base+'/knowledge/provisional/en')).json();
    assert.equal((await post('/speak',{kind:'reading',token:refreshed.answers[0].readingToken})).status,200);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('the browser renews an expired anonymous session once and preserves the contribution',async t=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    requests.push({url,options});
    if(requests.length===1)return {ok:false,status:401,json:async()=>({code:'SESSION_REQUIRED'})};
    if(url.endsWith('/session'))return {ok:true,status:200,json:async()=>({token:'fresh-session'})};
    return {ok:true,status:200,json:async()=>({source:'elevenlabs'})};
  });
  const {state,api}=await import('../public/passiton/state.js');
  state.sessionToken='expired-session';state.records={'provisional:en':{text:'Keep this draft',pending:{signature:'keep-pending-payment'}}};
  assert.equal((await api('/speak',{kind:'opening',questionId:'provisional',language:'en'})).source,'elevenlabs');
  assert.equal(requests.length,3);assert.equal(requests[2].options.headers['X-Passiton-Session'],'fresh-session');
  assert.equal(state.records['provisional:en'].text,'Keep this draft');
  assert.equal(state.records['provisional:en'].pending.signature,'keep-pending-payment');
  requests.length=0;
  globalThis.fetch=async()=>{requests.push(1);return {ok:false,status:401,json:async()=>({code:'SESSION_REQUIRED',error:'Session service unavailable'})};};
  await assert.rejects(()=>api('/speak',{}),/Session service unavailable/);
  assert.equal(requests.length,2);
});
