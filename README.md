# Openhand

A giving ledger where the donor can check every claim it makes. You give to a
cause, and the page shows you what came in, what went out, how long the money
sat still, and a spoken receipt whose every sentence is backed by a transaction
signature you can click.

Small causes ask for trust and hand back a screenshot. Openhand hands back proof.

Built for the DEV Weekend Challenge: Generosity Edition.

## Run it

```bash
cd openhand && npm install && cp .env.example .env && npm start
```

Open http://localhost:3000 for the overview, or go straight to the live ledger
at http://localhost:3000/app. The app runs with no credentials at all: each
integration that is missing its key falls back to a labelled substitute and the
UI says so, rather than pretending. Fill in `.env` to turn each one live.

To put real transactions behind a fresh cause wallet on devnet:

```bash
npm run seed
```

## What each sponsor does, and what breaks without it

**Solana, the truth.** Donations and payouts are real transfers on devnet. The
balance is read from the chain on every page load and never stored. Every ledger
row links to its signature on the explorer. Without this the totals are just
numbers in a table that anyone could type.

**Snowflake, the time.** Chain events are ingested and seven accountability
metrics are computed in SQL over that history: percent disbursed, median hours
from a donation to the next payout, how many donations are still unspent, days
since the last payout. A single chain query cannot tell you that a cause has
been holding your money for eleven days. That needs the ordered history in one
place. The SQL is in `sql/metrics.sql` and is shown in the UI.

**Google AI, the translation.** Gemini turns ledger rows into a plain donor
update. It is required to cite the signature behind every claim, and any claim
whose signature is not in the ledger is dropped before it reaches the page. The
UI reports how many were dropped. The model cannot invent a payout.

**ElevenLabs, the artifact.** The receipt is spoken and paced with deliberate
breaks so the numbers land one at a time. It is the part a donor actually keeps
and forwards, which is the difference between an audit trail and an update.

## Layout

```
server.js           HTTP API
lib/solana.js       chain reads, signature-keyed cache, rate-limit backoff
lib/snowflake.js    warehouse metrics, with the same seven computed locally as fallback
lib/gemini.js       grounded narrative and the claim-dropping gate
lib/voice.js        receipt script and speech
sql/metrics.sql     the accountability metrics
public/index.html   the overview, whose hero panel reads live chain data
public/app.html     the live ledger, receipt, and Phantom wallet donation
public/styles.css   design tokens: dark theme lock, one accent, one radius rule
```

## Known limits

- Runs on devnet. The public devnet RPC rate limits hard, so parsed transactions
  are cached by signature. A free Helius or QuickNode devnet URL in
  `SOLANA_RPC_URL` makes first load fast.
- `npm i snowflake-sdk` is needed before the Snowflake path can connect. It is
  not a hard dependency so the app installs and runs without it.

## A note on read latency

The public devnet RPC rate limits parsed-transaction calls hard. Openhand caches
parsed transactions by signature, warms that cache at boot, and holds the assembled
API response for `RESPONSE_TTL_MS` (20 seconds by default) so a visitor is never
left watching an empty panel. Every response reports `ageMs`, the age of the chain
read it came from. Set `SOLANA_RPC_URL` to a Helius or QuickNode devnet endpoint
and the cold read drops to well under a second.
