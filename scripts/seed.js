// Idempotent devnet-only demonstration. Private keys never enter the server.
import fs from 'node:fs';
import {Keypair,PublicKey,Transaction,SystemProgram,TransactionInstruction} from '@solana/web3.js';
import bs58 from 'bs58';
import {connection,health} from '../lib/solana.js';
const keysPath=process.env.OPENHAND_KEYS_PATH || new URL('../data/keys.json',import.meta.url);
const statePath=new URL('../data/seed-state.json',import.meta.url);
await health();
if(!fs.existsSync(keysPath)) {
  const cause=Keypair.generate(),donors=[Keypair.generate(),Keypair.generate()];
  fs.writeFileSync(keysPath,JSON.stringify({cause:[...cause.secretKey],donors:donors.map(d=>[...d.secretKey])}),{mode:0o600});
}
const raw=JSON.parse(fs.readFileSync(keysPath,'utf8'));
const cause=Keypair.fromSecretKey(Uint8Array.from(raw.cause));
const donors=raw.donors.map(d=>Keypair.fromSecretKey(Uint8Array.from(d)));
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{cause:cause.publicKey.toBase58(),vendor:Keypair.generate().publicKey.toBase58(),steps:{}};
if(state.cause!==cause.publicKey.toBase58())throw new Error('Seed state belongs to another wallet.');
const save=()=>fs.writeFileSync(statePath,JSON.stringify(state,null,2),{mode:0o600});
const configured=JSON.parse(fs.readFileSync(new URL('../data/causes.json',import.meta.url),'utf8'));
if(configured[0].wallet!==state.cause)throw new Error('Configure causes.json with this dedicated wallet before seeding.');
save();
async function step(id,from,to,lamports,memo) {
  let s=state.steps[id];
  if(!s){
    const latest=await connection.getLatestBlockhash('confirmed');
    const tx=new Transaction({feePayer:from.publicKey,recentBlockhash:latest.blockhash}).add(SystemProgram.transfer({fromPubkey:from.publicKey,toPubkey:to,lamports}));
    tx.add(new TransactionInstruction({keys:[],programId:new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),data:Buffer.from(memo)}));
    tx.sign(from);s={signature:bs58.encode(tx.signature),bytes:tx.serialize().toString('base64'),...latest};state.steps[id]=s;save();
  }
  let status=(await connection.getSignatureStatuses([s.signature],{searchTransactionHistory:true})).value[0];
  if(status?.err)throw new Error(`${id} failed on chain. Review before retrying.`);
  if(status?.confirmationStatus!=='finalized'){
    if(!status){
      if(await connection.getBlockHeight('confirmed')>s.lastValidBlockHeight)throw new Error(`${id} expired without a known result. Review ${s.signature} before resetting this step.`);
      await connection.sendRawTransaction(Buffer.from(s.bytes,'base64'),{skipPreflight:false,preflightCommitment:'confirmed',maxRetries:3});
    }
    const confirmation=await connection.confirmTransaction({signature:s.signature,blockhash:s.blockhash,lastValidBlockHeight:s.lastValidBlockHeight},'finalized');
    if(confirmation.value.err)throw new Error(`${id} failed on chain.`);
  }
  s.finalized=true;save();console.log(`${id}: https://explorer.solana.com/tx/${s.signature}?cluster=devnet`);
}
const have=await connection.getBalance(donors[0].publicKey,'finalized');
const needed=state.steps['fund-second']?.finalized ? 150005000 : 220000000;
if(!state.steps['gift-one'] && have<needed){
  console.log(`Fund this devnet donor to at least ${needed/1e9} test SOL: ${donors[0].publicKey.toBase58()}`);process.exit(2);
}
await step('fund-second',donors[0],donors[1].publicKey,60000000,'Openhand demo: provision second test donor');
await step('gift-one',donors[0],cause.publicKey,150000000,'Openhand demo: first fictional coat-drive contribution');
await step('gift-two',donors[1],cause.publicKey,50000000,'Openhand demo: second fictional coat-drive contribution');
await step('payout',cause,new PublicKey(state.vendor),80000000,'Openhand DEMO payout to a test vendor wallet. No real coats purchased.');
console.log(`Dedicated cause wallet: ${state.cause}`);
console.log(`Balance: ${await connection.getBalance(cause.publicKey,'finalized')} lamports`);
