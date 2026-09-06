import express from 'express';
import {createPassitonRouter} from './lib/passiton/routes.js';
import * as openSourceGuide from './lib/passiton/open-source-guide.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PublicKey } from '@solana/web3.js';
import { PORT } from './lib/config.js';
import { connection, readHistory, explorerAddress, health } from './lib/solana.js';
import { account } from './lib/accounting.js';
import { narrate, validateClaims, geminiConfigured } from './lib/gemini.js';
import { receiptScript, speak, voiceConfigured } from './lib/voice.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const causes = JSON.parse(fs.readFileSync(path.join(here,'data/causes.json'),'utf8'));
const responses = new Map(), inflight = new Map(), txCache = new Map(), receiptCache = new Map();
let networkCheck;
const FRESH_MS = 15000;
export const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'40kb'}));
app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','strict-origin-when-cross-origin');next();});
const requestWindows = new Map();
app.use('/api',(req,res,next)=>{
  if(req.method==='POST') {
    const origin=req.get('origin');
    try { if(origin && new URL(origin).host!==req.get('host')) return res.status(403).json({error:'Cross-origin requests are not supported.'}); } catch { return res.status(403).json({error:'Invalid request origin.'}); }
    const key=req.ip, now=Date.now();
    const hit=requestWindows.get(key);
    const window=hit && now-hit.since<60000 ? hit : {since:now,count:0};
    window.count++;requestWindows.set(key,window);
    if(requestWindows.size>2000) requestWindows.clear();
    if(window.count>90) return res.status(429).json({error:'Please wait a minute before retrying.'});
  }
  next();
});
app.use('/api/passiton/guides/open-source',createPassitonRouter({},openSourceGuide));
app.use('/api/passiton',createPassitonRouter());
app.get(['/', '/index.html'],(_req,res)=>res.sendFile(path.join(here,'public/index.html')));
app.get(['/app', '/pass-it-on'],(_req,res)=>res.sendFile(path.join(here,'public/passiton/index.html')));
app.get('/ledger',(_req,res)=>res.sendFile(path.join(here,'public/app.html')));
app.use(express.static(path.join(here,'public')));
app.get('/api/health',async(_req,res)=>{
  try {res.json({ok:true,chain:await health()});} catch {res.status(502).json({ok:false,error:'Devnet RPC unavailable or wrong network.'});}
});
app.get('/api/causes',(_req,res)=>res.json(causes));

export async function readCause(cause) {
  networkCheck ||= health().catch(err=>{networkCheck=null;throw err;});
  await networkCheck;
  const {ledger,history} = await readHistory(cause.wallet,connection,{cache:txCache});
  const balance = await connection.getBalanceAndContext(new PublicKey(cause.wallet),{commitment:'finalized',
    ...(ledger.length ? {minContextSlot:Math.max(...ledger.map(r=>r.slot))} : {})});
  const snapshotId = createHash('sha256').update(JSON.stringify({wallet:cause.wallet,ledger,balance:balance.value,history})).digest('hex').slice(0,24);
  const m = account(ledger,balance.value,history);
  if (txCache.size > 5000) txCache.clear();
  return {cause:{...cause,explorer:explorerAddress(cause.wallet)},ledger,history,metrics:m,
    balanceSol:balance.value/1e9,balanceSlot:balance.context.slot,readAt:Date.now(),snapshotId,
    integrations:{googleAI:{configured:geminiConfigured()},elevenLabs:{configured:voiceConfigured()}}};
}
function refresh(cause) {
  if (!inflight.has(cause.id)) inflight.set(cause.id,readCause(cause).then(d=>{responses.set(cause.id,d);return d;}).finally(()=>inflight.delete(cause.id)));
  return inflight.get(cause.id);
}
app.get('/api/cause/:id',async(req,res)=>{
  res.set('Cache-Control','no-store');
  const cause=causes.find(c=>c.id===req.params.id);
  if (!cause) return res.status(404).json({error:'No such cause.'});
  let d=responses.get(cause.id), refreshError=false;
  try {if (!d || Date.now()-d.readAt>FRESH_MS || req.query.refresh==='1') d=await refresh(cause);}
  catch {if (!d) return res.status(502).json({error:'Could not read devnet. Please retry in a moment.'});refreshError=true;}
  res.json({...d,ageMs:Date.now()-d.readAt,refreshError});
});

// One receipt per snapshot, shared across visitors. No arbitrary text-to-speech
// proxy; public callers cannot submit a prompt, voice script, or wallet key.
app.post('/api/cause/:id/receipt',async(req,res)=>{
  const cause=causes.find(c=>c.id===req.params.id);
  if (!cause) return res.status(404).json({error:'No such cause.'});
  let d=responses.get(cause.id);
  if (!d) { try { d=await refresh(cause); } catch { return res.status(502).json({error:'Could not verify this snapshot on devnet.'}); } }
  if (req.body.snapshotId!==d.snapshotId) return res.status(409).json({error:'The ledger changed or this server needs a fresh read. Refresh the ledger, then generate the update.'});
  try {
    if (!receiptCache.has(d.snapshotId)) {
      if (receiptCache.size>=30) receiptCache.delete(receiptCache.keys().next().value);
      receiptCache.set(d.snapshotId,(async()=>{
        const narrative=await narrate(cause,d.ledger,d.metrics,d.balanceSol);
        const audio=await speak(receiptScript(cause,d.metrics,narrative.summary,narrative.claims));
        return {narrative,audio,snapshotId:d.snapshotId,readAt:d.readAt,balanceSlot:d.balanceSlot,
          metrics:d.metrics,rowsUsed:d.ledger.length,evidence:d.ledger,history:d.history,cause:d.cause};
      })().catch(err=>{receiptCache.delete(d.snapshotId);throw err;}));
    }
    res.json(await receiptCache.get(d.snapshotId));
  } catch {res.status(502).json({error:'The update could not be generated. Please retry.'});}
});
app.post('/api/cause/:id/check-claim',async(req,res)=>{
  const cause=causes.find(c=>c.id===req.params.id);
  if (!cause) return res.status(404).json({error:'No such cause.'});
  let d=responses.get(req.params.id);
  if (!d) { try { d=await refresh(cause); } catch { return res.status(502).json({error:'Could not verify this snapshot on devnet.'}); } }
  if (!d || req.body.snapshotId!==d.snapshotId) return res.status(409).json({error:'Refresh the ledger first.'});
  res.json(validateClaims([req.body.claim],d.ledger));
});
// Wallet sends raw signed bytes to devnet through this narrowly scoped endpoint.
// Only blockhash + submission + status calls are permitted; no general RPC proxy.
app.post('/api/rpc',async(req,res)=>{
  const allowed=new Set(['getLatestBlockhash','sendTransaction','getSignatureStatuses']);
  if (!allowed.has(req.body.method) || !Array.isArray(req.body.params)) return res.status(400).json({error:'Unsupported RPC method.'});
  try {
    networkCheck ||= health().catch(err=>{networkCheck=null;throw err;});await networkCheck;
    const result=await fetch(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',{method:'POST',
      signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:req.body.method,params:req.body.params})});
    res.status(result.ok?200:502).json(await result.json());
  } catch {res.status(502).json({error:'Devnet RPC unavailable.'});}
});
app.use((err,_req,res,_next)=>res.status(400).json({error:'Invalid request.'}));
export default app;
if (!process.env.VERCEL && process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  app.listen(PORT,'127.0.0.1',()=>console.log(`Pass It On: http://localhost:${PORT}`));
}
