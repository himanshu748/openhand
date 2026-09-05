import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL } from './config.js';
import { SOL, incoming } from './accounting.js';

export const connection = new Connection(RPC_URL, { commitment: 'finalized', fetch: (url, options) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(12000) }) });
export const explorerTx = sig => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddress = address => `https://explorer.solana.com/address/${address}?cluster=devnet`;
const keyString = key => String(key.pubkey || key);

// One signature may contain several transfers and a fee. Preserve every event.
export function eventsFromTransaction(tx, signature, address) {
  if (!tx?.meta) return null;
  const keys = tx.transaction.message.accountKeys.map(keyString);
  const idx = keys.indexOf(address);
  if (idx < 0) return [];
  const instructions = [];
  (tx.transaction.message.instructions || []).forEach((ix, i) => {
    instructions.push({ ix, location: `outer-${i}` });
    for (const group of tx.meta.innerInstructions || []) if (group.index === i) {
      group.instructions.forEach((inner, j) => instructions.push({ ix: inner, location: `inner-${i}-${j}` }));
    }
  });
  const memos = instructions.filter(({ix}) => ['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr','Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'].includes(String(ix.programId)))
    .map(({ix}) => typeof ix.parsed === 'string' ? ix.parsed : null).filter(Boolean);
  const rows = [];
  const add = (id, kind, lamports, counterparty = null, memo = null) => {
    if (!Number.isSafeInteger(lamports) || lamports <= 0) return;
    rows.push({ id: `${signature}:${id}`, signature, kind, lamports, amountSol: lamports / SOL,
      counterparty, memo, slot: tx.slot, order: rows.length, blockTime: tx.blockTime ? tx.blockTime * 1000 : null,
      explorer: explorerTx(signature), failed: Boolean(tx.meta.err) });
  };
  if (idx === 0) add('fee', 'fee', tx.meta.fee);
  if (!tx.meta.err) {
    for (const {ix, location} of instructions) {
      if (String(ix.programId) !== '11111111111111111111111111111111') continue;
      if (!['transfer','transferWithSeed'].includes(ix.parsed?.type)) continue;
      const {source, destination, lamports} = ix.parsed.info;
      if (source === destination) continue;
      if (destination === address) add(location, 'donation', lamports, source, memos.join('; ') || null);
      if (source === address) add(location, 'payout', lamports, destination, memos.join('; ') || null);
    }
  }
  const delta = tx.meta.postBalances[idx] - tx.meta.preBalances[idx];
  const classified = rows.reduce((n, row) => n + (incoming(row) ? row.lamports : -row.lamports), 0);
  const residual = delta - classified;
  if (residual) add('unclassified', residual > 0 ? 'other-in' : 'other-out', Math.abs(residual), null,
    'Balance movement outside supported SOL transfer instructions; purpose unknown.');
  return rows;
}

// A bounded read must explicitly disclose that it stopped early.
export async function readHistory(address, rpc = connection, options = {}) {
  const key = new PublicKey(address);
  const pageSize = options.pageSize || 100, maxPages = options.maxPages || 10;
  const signatures = [], seen = new Set();
  let before, complete = false;
  for (let page = 0; page < maxPages; page++) {
    const batch = await rpc.getSignaturesForAddress(key, { limit: pageSize, ...(before ? { before } : {}) }, 'finalized');
    if (!batch.length) { complete = true; break; }
    let added = 0;
    for (const s of batch) if (!seen.has(s.signature)) { signatures.push(s); seen.add(s.signature); added++; }
    if (!added) break;
    before = batch.at(-1).signature;
    if (batch.length < pageSize) { complete = true; break; }
  }
  const ledger = [], missing = [];
  for (const s of signatures) {
    const cacheKey = `${address}:${s.signature}`;
    let rows = options.cache?.get(cacheKey);
    if (!rows) {
      const tx = await rpc.getParsedTransaction(s.signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
      rows = eventsFromTransaction(tx, s.signature, address);
      if (rows) options.cache?.set(cacheKey, rows);
    }
    if (rows === null) missing.push(s.signature);
    else ledger.push(...rows);
  }
  return { ledger: ledger.sort((a,b) => b.slot - a.slot || b.order - a.order),
    history: { complete: complete && !missing.length, signaturesRead: signatures.length, missingTransactions: missing.length,
      oldestSlot: signatures.at(-1)?.slot || null,
      scope: 'Finalized history available from this RPC; unsupported balance changes are shown separately.' } };
}

export async function health() {
  const genesis = await connection.getGenesisHash();
  if (genesis !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('RPC must use Solana devnet');
  return { network: 'devnet', commitment: 'finalized' };
}
