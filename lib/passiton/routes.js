import express from 'express';
import {randomUUID} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import * as practiceCatalog from './catalog.js';
import {issue,verify,verifyStoredReview,digest} from './proofs.js';
import {assess} from './intelligence.js';
import {transcribe,transcriptionConfigured,speakChecked} from './voice.js';
import {geminiConfigured} from '../gemini.js';
import {voiceConfigured} from '../voice.js';
import {coverage,recordEvent,warehouseConfigured,sql,coverageQuery} from './warehouse.js';
import {findPayment,verifyPayment,memoFor} from './payments.js';
import {connection,health} from '../solana.js';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const textField=(value,max=3000)=>{if(typeof value!=='string'||value.trim().length<8||value.length>max)throw fail(`Enter between 8 and ${max} characters.`);return value.trim();};
export function createPassitonRouter(overrides={},catalog=practiceCatalog){
  const {source,sourceVersion,questions,languages,getQuestion,getLanguage,bounty}=catalog;
  const collection=catalog.collection||{id:'practice',title:'Fictional grant - Practice'};
  const selectedCoverageSQL=coverageQuery();
  const deps={assess:input=>assess(input,{source}),coverage:()=>coverage({sourceVersion,questions}),recordEvent:event=>recordEvent(event,{sourceVersion}),findPayment,verifyPayment,transcribe,speakChecked,warehouseConfigured,sql,...overrides};
  const router=express.Router(),voices=new Map(),windows=new Map();
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(err){next(err);}};
  const session=req=>{try{return verify(req.get('X-Passiton-Session'),'session').id;}catch{throw Object.assign(fail('Your demo session expired. Start a new session and check your draft again.',401),{code:'SESSION_REQUIRED'});}};
  const checked=(token,kind,sid)=>{const data=verify(token,kind);if(data.sessionId!==sid||data.sourceVersion!==sourceVersion)throw fail('This record belongs to another demo session or an older source. Check it again.');return data;};
  function rate(req,bucket="voice",limit=12){const k=`${req.ip}:${bucket}`,now=Date.now();let w=windows.get(k);if(!w||now-w.at>60000)w={at:now,count:0};if(++w.count>limit)throw fail('Please wait a minute before another AI or audio request.',429);windows.set(k,w);if(windows.size>1000)windows.clear();}
  router.get('/catalog',(_req,res)=>res.json({source,sourceVersion,questions,languages,bounty,collection,starters:catalog.starterAnswer?Object.fromEntries(questions.map(q=>[q.id,Object.fromEntries(Object.keys(languages).map(l=>[l,catalog.starterAnswer(q.id,l)]))])):{},integrations:{gemini:geminiConfigured()?'configured':'not configured',elevenlabs:voiceConfigured()?'configured':'not configured',transcription:transcriptionConfigured()?'configured':'not configured',snowflake:warehouseConfigured()?'configured':'not configured',solana:'devnet'},scope:source.fictional?'Fictional scenario. Review is a demo role. Test SOL has no monetary value.':'Real public guide. Community review is a demo role, not authenticated independent review. Test SOL has no monetary value.'}));
  router.post('/session',(_req,res)=>res.json({token:issue('session',{id:randomUUID()},86400*7)}));
  router.get('/coverage',route(async(_req,res)=>res.json(await deps.coverage())));
  router.get('/coverage/sql',(_req,res)=>res.json({sql:selectedCoverageSQL,description:'Counts distinct demo sessions asking each question, joins human-reviewed contributions by language and current source version, and ranks unmet demand.'}));
  router.get('/knowledge/:questionId/:language',route(async(req,res)=>{
    getQuestion(req.params.questionId);getLanguage(req.params.language);
    if(!deps.warehouseConfigured())return res.json({answers:[],source:'local'});
    try{const result=await deps.sql("SELECT PAYLOAD:reviewToken::STRING token FROM PASSITON_EVENTS WHERE PAYLOAD:type::STRING='review' AND PAYLOAD:questionId::STRING=? AND PAYLOAD:language::STRING=? AND PAYLOAD:sourceVersion::STRING=? ORDER BY CREATED_AT DESC LIMIT 5",[req.params.questionId,req.params.language,sourceVersion]);
      const answers=[];for(const row of result.rows){try{const data=verifyStoredReview(row.token);if(data.sourceVersion===sourceVersion&&data.questionId===req.params.questionId&&data.language===req.params.language)answers.push({readingToken:issue('reading',data,3600),answer:data});}catch{}}
      res.json({answers,source:'snowflake',statementHandle:result.statementHandle});
    }catch{res.status(502).json({error:'Shared knowledge could not be loaded from Snowflake.'});}
  }));
  router.post('/question',route(async(req,res)=>{
    const sid=session(req),q=getQuestion(req.body.questionId),language=getLanguage(req.body.language);
    const storage=await deps.recordEvent({id:`question:${sid}:${q.id}:${language}:${sourceVersion}`,type:'question',sessionId:sid,questionId:q.id,language});
    res.json({question:q,language,storage});
  }));
  router.post('/check',route(async(req,res)=>{
    const sid=session(req),q=getQuestion(req.body.questionId),language=getLanguage(req.body.language),text=textField(req.body.text);
    rate(req,"gemini",5);const result=await deps.assess({question:q.title,language,text});
    const id=digest({sid,questionId:q.id,language,text,sourceVersion});
    const data={sessionId:sid,id,questionId:q.id,language,text,sourceVersion,result,checkedAt:Date.now()};
    const checkToken=issue('check',data);
    const storage=await deps.recordEvent({id:`check:${id}`,type:'check',sessionId:sid,contributionId:id,questionId:q.id,language,status:result.status});
    res.json({id,result,checkToken,storage});
  }));
  router.post('/ask',route(async(req,res)=>{
    const sid=session(req),q=getQuestion(req.body.questionId),language=getLanguage(req.body.language),question=textField(req.body.question,500);
    rate(req,"gemini",5);const result=await deps.assess({question:`Topic: ${q.title}. Student's question: ${question}`,language,text:question,mode:'ask'});
    const storage=await deps.recordEvent({id:randomUUID(),type:'question',sessionId:sid,questionId:q.id,language});
    const answerToken=issue('draft',{sessionId:sid,questionId:q.id,language,sourceVersion,result});
    res.json({result,answerToken,storage,reviewed:false});
  }));
  router.post('/transcribe',express.raw({type:['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg'],limit:'2mb'}),route(async(req,res)=>{
    session(req);rate(req);if(!Buffer.isBuffer(req.body)||req.body.length<100)throw fail('Record a short spoken answer first.');
    res.json(await deps.transcribe(req.body,req.get('content-type').split(';')[0]));
  }));
  router.post('/speak',route(async(req,res)=>{
    session(req);let text;
    if(!['opening','guide','review','reading','draft','check'].includes(req.body.kind))throw fail('Choose a supported spoken guidance type.');
    if(req.body.kind==='guide'){
      const q=getQuestion(req.body.questionId),lang=getLanguage(req.body.language),answer=catalog.starterAnswer?.(q.id,lang);
      if(!answer)throw fail('No prepared guide answer is available.');
      text=answer.claims.map(c=>c.text).join(' ');
    }else if(req.body.kind==='opening'){
      const q=getQuestion(req.body.questionId),lang=getLanguage(req.body.language);
      text=!source.fictional?(lang==='hi'?q.openingHi:`This question is based on the public Open Source Guides. ${q.title} Explain the advice in your own words.`):lang==='hi'?`यह एक काल्पनिक छात्रवृत्ति का डेमो है। ${q.id==='provisional'?'क्या अंतिम परिणाम आने से पहले आवेदन किया जा सकता है? कृपया उपलब्ध अंकपत्र और अंतिम परिणाम जमा करने की तारीख समझाएं।':q.id==='documents'?'आवेदन के लिए किन दस्तावेज़ों की आवश्यकता है?':'आवेदन कैसे जमा करें? समय सीमा और शुल्क समझाएं।'}`:`This is a fictional scholarship demo. ${q.title} Explain the steps and any important conditions in your own words.`;
    }else{
      const kind=req.body.kind;
      const data=verify(req.body.token,kind);if(data.sourceVersion!==sourceVersion)throw fail('This audio belongs to an older source version.');
      if(kind==='review'||kind==='reading')text=data.claims.map(c=>c.text).join(' ');
      else text=kind==='check'?(data.result.followUp||data.result.claims.map(c=>c.text).join(' ')):(data.result.status==='ready'?data.result.claims.map(c=>c.text).join(' '):data.result.followUp);
    }
    const key=digest(text);if(voices.has(key))return res.json(await voices.get(key));
    rate(req);if(voices.size>=40)voices.delete(voices.keys().next().value);
    const pending=deps.speakChecked(text).catch(error=>{voices.delete(key);throw error;});voices.set(key,pending);const result=await pending;
    if(result.source!=='elevenlabs')voices.delete(key);res.json(result);
  }));
  router.post('/review',route(async(req,res)=>{
    const sid=session(req),data=checked(req.body.checkToken,'check',sid);
    if(data.result.status!=='ready')throw fail('Resolve every source-check issue before review.',409);
    if(req.body.confirmedSource!==true||req.body.confirmedDemo!==true)throw fail('A human must check the source and acknowledge the demo review role.');
    const review={sessionId:sid,id:data.id,questionId:data.questionId,language:data.language,sourceVersion,claims:data.result.claims,reviewer:'Demo reviewer',reviewedAt:Date.now(),reviewMode:'demo-role'};
    const reviewToken=issue('review',review,86400*7);
    const storage=await deps.recordEvent({id:`review:${data.id}`,type:'review',sessionId:sid,questionId:data.questionId,language:data.language,contributionId:data.id,reviewToken});
    res.json({review,reviewToken,storage});
  }));
  router.post('/review/sync',route(async(req,res)=>{
    const sid=session(req),review=checked(req.body.reviewToken,'review',sid);
    const storage=await deps.recordEvent({id:`review:${review.id}`,type:'review',sessionId:sid,questionId:review.questionId,language:review.language,contributionId:review.id,reviewToken:req.body.reviewToken});
    res.json({id:review.id,storage});
  }));
  router.post('/payment/prepare',route(async(req,res)=>{
    const sid=session(req),review=checked(req.body.reviewToken,'review',sid);
    let payer;try{payer=new PublicKey(req.body.payer).toBase58();}catch{throw fail('Connect a valid devnet sponsor wallet.');}
    const existing=await deps.findPayment(review.id);if(existing)return res.json({alreadyPaid:true,payment:existing});
    if(payer===bounty.recipient)throw fail('Use a different sponsor wallet from the demo contributor.');
    await health();const latest=await connection.getLatestBlockhash('confirmed');
    const intent={sessionId:sid,sourceVersion,contributionId:review.id,questionId:review.questionId,language:review.language,payer,...bounty,memo:memoFor(review.id),...latest};
    res.json({intent,intentToken:issue('payment',intent,3600)});
  }));
  router.post('/payment/verify',route(async(req,res)=>{
    const sid=session(req),intent=checked(req.body.intentToken,'payment',sid);
    const payment=await deps.verifyPayment(req.body.signature,intent.contributionId,intent.payer);
    const storage=await deps.recordEvent({id:`payment:${payment.signature}`,type:'payment',sessionId:sid,questionId:intent.questionId,language:intent.language,contributionId:intent.contributionId,signature:payment.signature,lamports:payment.lamports});
    res.json({payment,storage,contributionId:intent.contributionId});
  }));
  router.use((err,_req,res,_next)=>{res.status(err.status||502).json({error:err.status?err.message:'The service could not finish this step. Your draft is preserved; please retry.',...(err.code==='SESSION_REQUIRED'?{code:err.code}:{})});});
  return router;
}
