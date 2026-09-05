import {PublicKey} from '@solana/web3.js';
import {connection,health} from '../solana.js';
import {bounty} from './catalog.js';
const memoProgram='MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const memoFor=id=>`passiton:v1:${id}`;
export function validatePayment(tx,{memo,payer,recipient=bounty.recipient,lamports=bounty.lamports}){
  if(!tx||tx.meta?.err||!tx.meta)throw new Error('The transaction is missing or failed.');
  const instructions=tx.transaction?.message?.instructions||[];
  const signer=tx.transaction?.message?.accountKeys?.find(k=>k.pubkey.toString()===payer&&k.signer);
  const transfer=instructions.filter(i=>i.program==='system'&&i.parsed?.type==='transfer'&&i.parsed.info.source===payer&&i.parsed.info.destination===recipient);
  const hasMemo=instructions.some(i=>i.programId?.toString()===memoProgram&&i.parsed===memo);
  if(!signer||transfer.length!==1||transfer[0].parsed.info.lamports!==lamports||!hasMemo)throw new Error('The sender, recipient, exact amount, or contribution memo does not match this bounty.');
  return {lamports,recipient,payer,memo,slot:tx.slot,blockTime:tx.blockTime};
}
export async function findPayment(contributionId){
  await health();const signatures=await connection.getSignaturesForAddress(new PublicKey(bounty.recipient),{limit:100},'finalized');
  const memo=memoFor(contributionId);
  const candidates=signatures.filter(s=>!s.err&&s.memo?.includes(memo));
  for(const s of candidates){const tx=await connection.getParsedTransaction(s.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
    const transfer=tx?.transaction.message.instructions.find(i=>i.program==='system'&&i.parsed?.type==='transfer'&&i.parsed.info.destination===bounty.recipient);
    if(transfer){try{const data=validatePayment(tx,{memo,payer:transfer.parsed.info.source});return {...data,signature:s.signature,explorer:`https://explorer.solana.com/tx/${s.signature}?cluster=devnet`};}catch{}}
  }
  // Do not infer unpaid if there may be older history outside this bounded read.
  if(signatures.length===100)throw Object.assign(new Error('Recipient history exceeds the demo lookup limit. Inspect the chain before making another payment.'),{status:409});
  return null;
}
export async function verifyPayment(signature,contributionId,payer){
  if(typeof signature!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature))throw Object.assign(new Error('Invalid Solana signature.'),{status:400});
  await health();const status=(await connection.getSignatureStatuses([signature],{searchTransactionHistory:true})).value[0];
  if(!status||status.err||status.confirmationStatus!=='finalized')throw Object.assign(new Error('The payment has not finalized successfully. Wait and verify again; do not send another payment.'),{status:409});
  const tx=await connection.getParsedTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
  const data=validatePayment(tx,{memo:memoFor(contributionId),payer});return {...data,signature,explorer:`https://explorer.solana.com/tx/${signature}?cluster=devnet`};
}
