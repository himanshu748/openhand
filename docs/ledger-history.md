# Openhand

**What happened after I gave?** Openhand follows contributions into a shared wallet, separates payouts from network fees, and makes the remaining balance inspectable. Open any total to see the transactions behind it, then copy a timestamped update with public evidence links.

This is a **fictional coat-drive demonstration on Solana devnet**. All SOL is test currency without monetary value. No real charity is collecting donations here. A transfer proves money moved; a memo records what its sender said. Neither proves goods were purchased or delivered.

## Run

Requires Node.js 22 or later.

```sh
npm ci
cp .env.example .env
npm start
```

Open `http://localhost:3000/app`. Read-only evidence and deterministic updates work without sponsor keys. Optional integrations state their actual status in the app.

```sh
npm test       # accounting, history coverage, receipt validation regressions
npm run check # syntax
npm run ingest # read finalized history and check balance reconciliation
```

## A complete demo

1. Open the dedicated demo cause and inspect the two incoming contributions.
2. Open the paid-out total. Its transfer amount excludes the separate network fee.
3. Inspect each donation’s FIFO allocation and remaining amount.
4. Compare received minus payouts minus fees with the independently read wallet balance.
5. Generate a checked update. Copy its timestamped text and explorer links or download the snapshot JSON.
6. Try the altered-claim check: keep a real event ID but add 1 SOL. It is rejected.
7. Optionally connect Phantom to sign a 0.05 devnet SOL transfer. The app submits it only through its devnet RPC and waits for finalization before reporting that it appears in the ledger.

## How the evidence works

- **Solana:** finalized parsed System Program transfers, including inner instructions. Each transfer has a unique event ID, even when several share a signature. Fees and unsupported balance changes appear separately. Failed transactions contribute fees, not their reverted transfer instructions.
- **History:** paginated through available RPC history, bounded at 1,000 signatures per read. Missing parsed transactions are retried on later reads. If pagination is capped or a transaction is missing, coverage is explicitly incomplete. RPC retention can limit history; reconciling a balance does not establish real-world impact.
- **Accounting:** integer lamports. Incoming contributions form FIFO lots; partial payouts, fees, and other outflows consume those lots separately. Allocation is suppressed if history is incomplete, balance does not reconcile, or same-slot transaction ordering is ambiguous. FIFO is an accounting policy for fungible pooled funds.
- **Google AI (optional):** Gemini selects relevant structured events. Code validates the exact event ID, direction, amount, and memo. Only code-generated sentences reach the screen and audio. Free-form model summaries are never trusted or displayed.
- **ElevenLabs (optional):** speaks the same checked text. Audio is returned inline and the receipt is cached per snapshot, so it does not depend on writable public storage.

## Seed a dedicated wallet

The seed script is local-only. The public server never reads wallet private keys.

```sh
OPENHAND_KEYS_PATH=/absolute/path/to/local/demo-keys.json npm run seed
```

The key file contains a `cause` keypair and two `donors`, each serialized as a Solana secret-key byte array. If absent, the script generates local keys; configure `data/causes.json` to the generated cause public address before proceeding. Fund the first donor with at least 0.22 devnet SOL. It provisions a second test donor, sends 0.15 and 0.05 SOL to the cause, and sends 0.08 SOL to a distinct test vendor wallet with an explicit fictional-demo memo.

Each signed transaction is persisted in ignored `data/seed-state.json` **before** submission. Reruns check the same signatures and never intentionally issue duplicate gifts. An expired transaction with an uncertain outcome stops for review. Keep the key file and seed state together, outside deployments.

## Deployment and configuration

Vercel detects the Express entry point in `server.js`. Public assets are in `public/`; server state is a bounded per-instance optimization. A receipt request on a cold instance re-reads devnet before accepting its snapshot ID. No wallet keys belong in Vercel.

`SOLANA_RPC_URL` may point to a dedicated devnet endpoint; the server checks devnet’s genesis hash and does not expose the URL to visitors. Provider keys remain server-only. Use provider quotas for public audio/AI generation; the app caches receipts and applies a basic per-instance request limit, not a distributed billing cap.

Public devnet RPC can throttle. The UI provides retry and timestamps, and never labels a failed refresh as a new chain read. Supported currency is native SOL only. This is not a tax-receipt system, production custody service, or verification of charitable delivery.
