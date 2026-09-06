import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import * as guide from '../lib/passiton/open-source-guide.js';
import {sourceVersion as practiceVersion} from '../lib/passiton/catalog.js';
import {createPassitonRouter} from '../lib/passiton/routes.js';
import {validateAssessment} from '../lib/passiton/intelligence.js';
import {verify,issue} from '../lib/passiton/proofs.js';
import {coverageQuery} from '../lib/passiton/warehouse.js';
import {collectionFromSearch} from '../public/passiton/collections.js';
import {questionLink,answerHandout} from '../public/passiton/sharing.js';

test('new visits select the real guide while old links still select the unchanged practice source',()=>{
 assert.equal(collectionFromSearch(''),'open-source');
 assert.equal(collectionFromSearch('?question=provisional&view=fund'),'practice');
 assert.equal(collectionFromSearch('?example=correction'),'practice');
 assert.equal(collectionFromSearch('?question=oss-non-code&example=correction'),'open-source');
 assert.equal(collectionFromSearch('?collection=practice'),'practice');
 assert.equal(practiceVersion,'6f9c5ad4be602c62043fbea3df44003d33e86e01a3e1c437bffe3fdcd4f47d30');
 assert.notEqual(guide.sourceVersion,practiceVersion);
});
test('all prepared translations contain real-source excerpts and exports keep attribution',()=>{
 for(const q of guide.questions)for(const language of ['en','hi']){
  const answer=guide.starterAnswer(q.id,language);
  assert.equal(answer.kind,'starter');assert.equal(answer.reviewedAt,undefined);
  const assessment=validateAssessment({status:'ready',claims:answer.claims,issues:[],followUp:''},guide.source);
  assert.equal(assessment.status,'ready');
  const url=questionLink('https://example.org',q.id,language,'open-source');
  assert.ok(url.includes('collection=open-source'));
  const text=answerHandout({question:q,language,languageName:guide.languages[language],answer,source:guide.source,sourceVersion:guide.sourceVersion,url});
  for(const expected of ['CC BY 4.0','GitHub and Open Source Guides contributors','https://opensource.guide/how-to-contribute/','not independently reviewed','2026-09-06','does not update'])assert.ok(text.includes(expected),expected);
  assert.ok(!text.includes('FICTIONAL DEMO'));
 }
});
test('coverage queries bind the selected catalog instead of mixing collection rows',()=>{
 const query=coverageQuery();assert.equal((query.match(/\?/g)||[]).length,3);
 assert.ok(query.includes('PARSE_JSON(?)'));assert.ok(!query.includes('FROM PASSITON_QUESTIONS'));
});
test('real-guide review proofs are isolated from practice and starter speech cannot authorize payment',async()=>{
 const events=[],spoken=[];
 const answer=guide.starterAnswer('oss-non-code','en');
 const deps={warehouseConfigured:()=>true,sql:async()=>({rows:events.filter(e=>e.reviewToken).map(e=>({token:e.reviewToken}))}),coverage:async()=>({source:'test',rows:[]}),recordEvent:async e=>{events.push(e);return {source:'test',saved:true};},assess:async()=>({status:'ready',claims:answer.claims,issues:[],followUp:'Check the source.'}),speakChecked:async text=>{spoken.push(text);return {source:'elevenlabs',url:'data:audio/mpeg;base64,AAAA'};}};
 const app=express();app.use(express.json());app.use('/real',createPassitonRouter(deps,guide));app.use('/practice',createPassitonRouter(deps));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const token=issue('session',{id:'collection-test'});
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json','X-Passiton-Session':token},body:JSON.stringify(body)});
 try{
  const checked=await(await post('/real/check',{questionId:'oss-non-code',language:'en',text:guide.questions[0].examples.correct})).json();
  assert.equal(verify(checked.checkToken,'check').sourceVersion,guide.sourceVersion);
  const reviewBody={checkToken:checked.checkToken,confirmedSource:true,confirmedDemo:true};
  assert.equal((await post('/practice/review',reviewBody)).status,400);
  assert.equal((await post('/real/review',reviewBody)).status,200);
  const knowledge=await(await fetch(base+'/real/knowledge/oss-non-code/en')).json();
  assert.equal(knowledge.answers.length,1);
  const old=await(await fetch(base+'/practice/knowledge/provisional/en')).json();assert.equal(old.answers.length,0);
  assert.equal((await post('/practice/speak',{kind:'reading',token:knowledge.answers[0].readingToken})).status,400);
  assert.equal((await post('/real/speak',{kind:'guide',questionId:'oss-non-code',language:'hi'})).status,200);
  assert.ok(spoken.at(-1).includes('दस्तावेज़'));
  assert.equal((await post('/real/payment/prepare',{reviewToken:knowledge.answers[0].readingToken,payer:'invalid'})).status,400);
  assert.equal((await post('/practice/speak',{kind:'guide',questionId:'provisional',language:'en'})).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
