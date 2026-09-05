import test from 'node:test';
import assert from 'node:assert/strict';
import {account,SOL,formatSol} from '../lib/accounting.js';
import {eventsFromTransaction,readHistory} from '../lib/solana.js';
import {validateClaims,narrate} from '../lib/gemini.js';
const address='4PE51NDu1ZF887SXm3vythAakAUUMPufuPjy7V3PX29j';
const row=(id,kind,lamports,slot=1)=>({id,signature:id,kind,lamports,amountSol:lamports/SOL,slot,order:0,counterparty:'donor',memo:null,explorer:'https://explorer.solana.com/tx/test?cluster=devnet'});
const transfer=(source,destination,lamports)=>({programId:'11111111111111111111111111111111',parsed:{type:'transfer',info:{source,destination,lamports}}});
const tx=(instructions,pre,post,extra={})=>({slot:10,blockTime:1000,transaction:{message:{accountKeys:[address,'other','third'],instructions}},meta:{preBalances:pre,postBalances:post,fee:5000,err:null,...extra}});
test('fee-only successful transaction is never a payout',()=>{
  const rows=eventsFromTransaction(tx([], [SOL,0,0],[SOL-5000,0,0]),'sig',address);
  assert.deepEqual(rows.map(r=>[r.kind,r.lamports]),[['fee',5000]]);
});
test('outgoing transfer excludes fee and preserves counterparty',()=>{
  const rows=eventsFromTransaction(tx([transfer(address,'other',100)], [SOL,0,0],[SOL-5100,100,0]),'sig',address);
  assert.deepEqual(rows.map(r=>[r.kind,r.lamports]),[['fee',5000],['payout',100]]);
  assert.equal(rows[1].counterparty,'other');
});
test('multiple transfers in one signature keep unique event IDs',()=>{
  const rows=eventsFromTransaction(tx([transfer(address,'other',100),transfer(address,'third',200)],[SOL,0,0],[SOL-5300,100,200]),'sig',address);
  assert.equal(new Set(rows.map(r=>r.id)).size,3);assert.equal(rows.filter(r=>r.kind==='payout').length,2);
});
test('failed instructions do not become transfers but their fee remains',()=>{
  const rows=eventsFromTransaction(tx([transfer(address,'other',100)],[SOL,0,0],[SOL-5000,0,0],{err:{InstructionError:[0,'error']}}),'sig',address);
  assert.deepEqual(rows.map(r=>r.kind),['fee']);
});
test('inner system transfer is counted once',()=>{
  const rows=eventsFromTransaction(tx([{programId:'custom'}],[SOL,0,0],[SOL-5100,100,0],{innerInstructions:[{index:0,instructions:[transfer(address,'other',100)]}]}),'sig',address);
  assert.equal(rows.find(r=>r.kind==='payout').lamports,100);
});
test('unsupported balance movements remain separate',()=>{
  const rows=eventsFromTransaction(tx([],[SOL,0,0],[SOL-6000,0,0]),'sig',address);
  assert.deepEqual(rows.map(r=>[r.kind,r.lamports]),[['fee',5000],['other-out',1000]]);
});
test('partial payout leaves 99 of 100 SOL available',()=>{
  const m=account([row('d','donation',100*SOL),row('p','payout',SOL,2)],99*SOL,{complete:true});
  assert.equal(m.remaining_donations,1);assert.equal(m.remaining_donation_sol,99);assert.equal(m.contributions[0].payoutLamports,SOL);
});
test('FIFO allocates fees separately and keeps a partial second donation',()=>{
  const m=account([row('d1','donation',100),row('d2','donation',100,2),row('fee','fee',5,3),row('p','payout',120,4)],75,{complete:true});
  assert.equal(m.fullyAccounted,true);assert.deepEqual(m.contributions.map(c=>c.remainingLamports),[0,75]);
  assert.equal(m.contributions[0].feeLamports,5);assert.equal(m.contributions[0].payoutLamports,95);
});
test('missing history and balance mismatch suppress allocation claims',()=>{
  for(const [balance,complete] of [[99,false],[101,true]]){const m=account([row('d','donation',100)],balance,{complete});assert.equal(m.fullyAccounted,false);assert.equal(m.remaining_donations,null);assert.deepEqual(m.contributions,[]);}
});
test('same-slot transaction order is not invented for FIFO',()=>{
  const m=account([row('d','donation',100),row('p','payout',20)],80,{complete:true});assert.equal(m.allocationOrderKnown,false);assert.equal(m.remaining_donations,null);
});
test('one lamport is never rounded down to zero',()=>{assert.equal(formatSol(1),'0.000000001');assert.equal(formatSol(5000),'0.000005');});
test('pagination reads beyond first page',async()=>{
  const pages=[[{signature:'a',slot:2},{signature:'b',slot:1}],[{signature:'c',slot:0}]];const cursors=[];
  const fake={getSignaturesForAddress:async(_k,p)=>{cursors.push(p.before);return pages.shift();},getParsedTransaction:async()=>tx([],[SOL,0,0],[SOL-5000,0,0])};
  const r=await readHistory(address,fake,{pageSize:2});assert.equal(r.history.signaturesRead,3);assert.equal(r.history.complete,true);assert.deepEqual(cursors,[undefined,'b']);
});
test('page cap marks history incomplete',async()=>{
  const fake={getSignaturesForAddress:async()=>[{signature:'a',slot:2}],getParsedTransaction:async()=>tx([],[SOL,0,0],[SOL-5000,0,0])};
  const r=await readHistory(address,fake,{pageSize:1,maxPages:1});assert.equal(r.history.complete,false);
});
test('temporarily missing parsed transactions are not negatively cached',async()=>{
  const cache=new Map();let ready=false;
  const fake={getSignaturesForAddress:async()=>[{signature:'a',slot:2}],getParsedTransaction:async()=>ready?tx([],[SOL,0,0],[SOL-5000,0,0]):null};
  assert.equal((await readHistory(address,fake,{cache})).history.complete,false);assert.equal(cache.size,0);ready=true;
  assert.equal((await readHistory(address,fake,{cache})).history.complete,true);
});
test('known signature with fabricated amount is rejected',()=>{
  const r=row('event','payout',SOL);const result=validateClaims([{eventId:r.id,kind:r.kind,lamports:999*SOL,memo:null}],[r]);assert.equal(result.claims.length,0);assert.equal(result.rejected.length,1);
});
test('fabricated purpose, wrong direction and unknown event rejected',()=>{
  const r=row('event','payout',SOL);for(const change of [{memo:'bought 500 coats'},{kind:'donation'},{eventId:'unknown'}])assert.equal(validateClaims([{eventId:r.id,kind:r.kind,lamports:r.lamports,memo:null,...change}],[r]).claims.length,0);
});
test('free-form model summary never reaches output',async()=>{
  const prior=process.env.GOOGLE_API_KEY;process.env.GOOGLE_API_KEY='mock';
  try{const r=row('p','payout',SOL);const m=account([r],0,{complete:false});
    const n=await narrate({title:'Test'},[r],m,0,{fetch:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary:'999 SOL bought 500 coats',claims:[{eventId:'p',kind:'payout',lamports:999*SOL,memo:null}]})}]}}]})})});
    assert.equal(n.summary.includes('999'),false);assert.equal(n.claims.some(c=>c.text.includes('999')),false);assert.equal(n.droppedClaims,1);
  }finally{if(prior===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=prior;}
});
test('malformed model claims safely reject',()=>{for(const bad of [null,{},'text'])assert.equal(validateClaims(bad,[]).claims.length,0);});
