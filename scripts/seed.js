// Creates a real cause wallet on devnet and puts real transactions behind it:
// two donations in, one payout out with a memo. Nothing here is simulated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey,
  SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction,
} from '@solana/web3.js';
import { RPC_URL } from '../lib/config.js';

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const here = path.dirname(fileURLToPath(import.meta.url));
const keysPath = path.join(here, '..', 'data', 'keys.json');
const causesPath = path.join(here, '..', 'data', 'causes.json');
const conn = new Connection(RPC_URL, 'confirmed');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadOrCreateKeys() {
  if (fs.existsSync(keysPath)) {
    const raw = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    return {
      cause: Keypair.fromSecretKey(Uint8Array.from(raw.cause)),
      donors: raw.donors.map((d) => Keypair.fromSecretKey(Uint8Array.from(d))),
    };
  }
  const cause = Keypair.generate();
  const donors = [Keypair.generate(), Keypair.generate()];
  fs.writeFileSync(
    keysPath,
    JSON.stringify({ cause: Array.from(cause.secretKey), donors: donors.map((d) => Array.from(d.secretKey)) }, null, 2)
  );
  return { cause, donors };
}

async function fund(kp, sol) {
  const have = await conn.getBalance(kp.publicKey);
  if (have >= sol * LAMPORTS_PER_SOL) {
    console.log(`  already funded: ${kp.publicKey.toString()} (${have / LAMPORTS_PER_SOL} SOL)`);
    return true;
  }
  try {
    const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, 'confirmed');
    console.log(`  airdropped ${sol} SOL to ${kp.publicKey.toString()}`);
    return true;
  } catch (err) {
    console.log(`  AIRDROP FAILED for ${kp.publicKey.toString()}: ${String(err.message || err).slice(0, 120)}`);
    return false;
  }
}

async function transfer(from, to, sol, memo) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports: Math.round(sol * LAMPORTS_PER_SOL) })
  );
  if (memo) {
    tx.add(new TransactionInstruction({ keys: [], programId: MEMO_PROGRAM, data: Buffer.from(memo, 'utf8') }));
  }
  const sig = await sendAndConfirmTransaction(conn, tx, [from], { commitment: 'confirmed' });
  console.log(`  ${sol} SOL ${memo ? `(memo: ${memo}) ` : ''}-> ${sig}`);
  return sig;
}

const { cause, donors } = loadOrCreateKeys();
console.log(`Cause wallet: ${cause.publicKey.toString()}`);
console.log(`RPC: ${RPC_URL}\n`);

console.log('Funding donor wallets from the devnet faucet');
const funded = [];
for (const d of donors) {
  if (await fund(d, 1)) funded.push(d);
  await sleep(1500);
}

if (funded.length === 0) {
  console.log('\nNo donor wallet could be funded. The devnet faucet is rate limited.');
  console.log('Fund this address manually at https://faucet.solana.com then re-run:');
  console.log(`  ${donors[0].publicKey.toString()}`);
  process.exit(1);
}

console.log('\nRecording donations on chain');
for (const d of funded) await transfer(d, cause.publicKey, 0.35, null);

console.log('\nRecording a payout on chain');
await transfer(cause.publicKey, funded[0].publicKey, 0.2, 'paid Northline Outfitters for 24 coats');

const causes = JSON.parse(fs.readFileSync(causesPath, 'utf8'));
causes[0].wallet = cause.publicKey.toString();
fs.writeFileSync(causesPath, JSON.stringify(causes, null, 2));

const bal = await conn.getBalance(cause.publicKey);
console.log(`\nDone. Cause balance on chain: ${bal / LAMPORTS_PER_SOL} SOL`);
console.log(`Explorer: https://explorer.solana.com/address/${cause.publicKey.toString()}?cluster=devnet`);
