import fs from 'node:fs';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RPC_URL } from './config.js';

const MEMO_PROGRAMS = new Set([
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
]);

const connection = new Connection(RPC_URL, 'confirmed');

export function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

// The balance is never stored. It is asked of the chain every time.
export async function chainBalance(address) {
  const lamports = await connection.getBalance(new PublicKey(address));
  return lamports / LAMPORTS_PER_SOL;
}

function extractMemo(tx) {
  const msg = tx.transaction.message;
  for (const ix of msg.instructions || []) {
    if (MEMO_PROGRAMS.has(ix.programId.toString())) {
      if (typeof ix.parsed === 'string') return ix.parsed;
      if (ix.data) return ix.data;
    }
  }
  const inner = tx.meta?.innerInstructions || [];
  for (const group of inner) {
    for (const ix of group.instructions || []) {
      if (MEMO_PROGRAMS.has(ix.programId?.toString?.())) {
        if (typeof ix.parsed === 'string') return ix.parsed;
      }
    }
  }
  return null;
}

// Confirmed transactions never change, so parsed results are cached by
// signature. Balances are never cached: those are always asked of the chain.
const CACHE_PATH = new URL('../data/txcache.json', import.meta.url);
let txCache = null;
function cache() {
  if (txCache) return txCache;
  try {
    txCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    txCache = {};
  }
  return txCache;
}
function persist() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(txCache));
  } catch {
    /* cache is an optimisation, not a requirement */
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Public RPC rate limits batched parsed-transaction calls, so fetch in small
// chunks and back off rather than dropping rows on the floor.
const isRateLimit = (err) => err?.code === 429 || /429|Too many requests/i.test(String(err?.message || ''));

async function fetchParsed(signatures) {
  const chunkSize = Number(process.env.RPC_CHUNK_SIZE || 1);
  const gap = Number(process.env.RPC_GAP_MS || 350);
  const out = [];
  for (let i = 0; i < signatures.length; i += chunkSize) {
    const chunk = signatures.slice(i, i + chunkSize);
    let attempt = 0;
    for (;;) {
      try {
        out.push(...(await connection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 })));
        break;
      } catch (err) {
        if (!isRateLimit(err) || attempt >= 5) throw err;
        await sleep(600 * 2 ** attempt++);
      }
    }
    if (i + chunkSize < signatures.length) await sleep(gap);
  }
  return out;
}

function rowFrom(tx, signature, blockTime, address) {
  if (!tx || tx.meta?.err) return null;
  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toString());
  const idx = keys.indexOf(address);
  if (idx === -1) return null;

  const delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / LAMPORTS_PER_SOL;
  if (delta === 0) return null;

  const counterpartyIdx = keys.findIndex((k, j) => {
    if (j === idx) return false;
    const d = tx.meta.postBalances[j] - tx.meta.preBalances[j];
    return delta > 0 ? d < 0 : d > 0;
  });

  return {
    signature,
    kind: delta > 0 ? 'donation' : 'payout',
    amountSol: Math.abs(delta),
    counterparty: counterpartyIdx === -1 ? null : keys[counterpartyIdx],
    blockTime: blockTime ? blockTime * 1000 : null,
    memo: extractMemo(tx),
    explorer: explorerTx(signature),
  };
}

// Every row here is derived from a confirmed transaction signature.
export async function chainLedger(address, limit = Number(process.env.LEDGER_LIMIT || 12)) {
  const key = new PublicKey(address);
  const sigs = await connection.getSignaturesForAddress(key, { limit });
  if (sigs.length === 0) return [];

  const c = cache();
  const rows = [];
  const misses = [];

  for (const s of sigs) {
    const hit = c[`${address}:${s.signature}`];
    if (hit === null) continue;
    if (hit) rows.push(hit);
    else misses.push(s);
  }

  if (misses.length) {
    const txs = await fetchParsed(misses.map((s) => s.signature));
    misses.forEach((s, i) => {
      const row = rowFrom(txs[i], s.signature, s.blockTime, address);
      c[`${address}:${s.signature}`] = row;
      if (row) rows.push(row);
    });
    persist();
  }

  return rows.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));
}

export async function health() {
  const version = await connection.getVersion();
  return { rpc: RPC_URL, solanaCore: version['solana-core'] };
}
