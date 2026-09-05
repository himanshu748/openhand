import test from 'node:test';
import assert from 'node:assert/strict';
import {app,readCause} from '../server.js';
import {connection} from '../lib/solana.js';
const wallet='4PE51NDu1ZF887SXm3vythAakAUUMPufuPjy7V3PX29j';
connection.getGenesisHash=async()=> 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
connection.getSignaturesForAddress=async()=>[];
connection.getBalanceAndContext=async()=>({context:{slot:12},value:0});
const cause={id:'winter-coats',title:'Winter Coats, Ward 4',purpose:'A fictional coat-drive demonstration. Real devnet transfers, test SOL with no monetary value. No real charity is collecting funds here.',goalSol:2.5,wallet,organizer:'Ward 4 Mutual Aid',demo:true};
test('HTTP API verifies cold receipt snapshots and rejects tampering',async()=>{
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  try{
    const d=await readCause(cause);
    const cold=await post('/api/cause/winter-coats/receipt',{snapshotId:d.snapshotId});assert.equal(cold.status,200);
    assert.equal((await cold.json()).narrative.source,'deterministic');
    assert.equal((await post('/api/cause/winter-coats/receipt',{snapshotId:'tampered'})).status,409);
    assert.equal((await post('/api/cause/winter-coats/check-claim',{snapshotId:d.snapshotId,claim:{eventId:'invented',kind:'payout',lamports:999}})).status,200);
    assert.equal((await post('/api/rpc',{method:'requestAirdrop',params:[]})).status,400);
    assert.equal((await post('/api/rpc',{method:'getLatestBlockhash',params:[]},{origin:'https://unrelated.example'})).status,403);
    assert.equal((await fetch(base+'/api/cause/missing')).status,404);
    const health=await (await fetch(base+'/api/health')).json();assert.equal('rpc' in health.chain,false);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
