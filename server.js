import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PORT, report, status } from './lib/config.js';
import { chainBalance, chainLedger, explorerAddress, health } from './lib/solana.js';
import { metrics, snowflakeConfigured } from './lib/snowflake.js';
import { narrate } from './lib/gemini.js';
import { receiptScript, speak } from './lib/voice.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const causesPath = path.join(here, 'data', 'causes.json');
const receiptsDir = path.join(here, 'public', 'receipts');

const loadCauses = () => JSON.parse(fs.readFileSync(causesPath, 'utf8'));
const findCause = (id) => loadCauses().find((c) => c.id === id);

const app = express();
app.use(express.json());
app.use(express.static(path.join(here, 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    res.json({ ok: true, chain: await health(), integrations: status().map(({ key, label, live, missing }) => ({ key, label, live, missing })) });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/app', (_req, res) => res.sendFile(path.join(here, 'public', 'app.html')));

app.get('/api/causes', (_req, res) => res.json(loadCauses()));

// The public devnet RPC takes upward of ten seconds to parse a busy wallet's
// transactions, so a request must never sit and wait on it. A cached read is
// always served immediately and refreshed in the background; only a genuinely
// cold cache waits, and then only until COLD_WAIT_MS. Every response states the
// age of the chain read it came from, so a stale number is never passed off as
// a live one.
const FRESH_MS = Number(process.env.FRESH_MS || 30000);
const COLD_WAIT_MS = Number(process.env.COLD_WAIT_MS || 4000);
const responses = new Map();
const inflight = new Map();

async function readCause(cause) {
  const [balance, ledger] = await Promise.all([chainBalance(cause.wallet), chainLedger(cause.wallet)]);
  const m = await metrics(cause.id, ledger);
  return {
    cause: { ...cause, explorer: explorerAddress(cause.wallet) },
    balanceSol: balance,
    ledger,
    metrics: m,
    snowflakeLive: snowflakeConfigured(),
    readAt: Date.now(),
  };
}

// One chain read per cause at a time. Concurrent callers share it rather than
// stampeding an endpoint that is already rate limiting us.
function refresh(cause) {
  if (!inflight.has(cause.id)) {
    const p = readCause(cause)
      .then((data) => {
        responses.set(cause.id, data);
        return data;
      })
      .finally(() => inflight.delete(cause.id));
    inflight.set(cause.id, p);
  }
  return inflight.get(cause.id);
}

app.get('/api/cause/:id', async (req, res) => {
  const cause = findCause(req.params.id);
  if (!cause) return res.status(404).json({ error: 'no such cause' });

  const hit = responses.get(cause.id);
  const age = hit ? Date.now() - hit.readAt : Infinity;

  if (hit) {
    // Serve what we have straight away. If it has gone stale, start the next
    // read in the background so the following visitor gets a newer one.
    if (age > FRESH_MS) refresh(cause).catch(() => {});
    return res.json({ ...hit, ageMs: age, refreshing: age > FRESH_MS });
  }

  // Nothing cached at all. Wait, but only briefly.
  try {
    const data = await Promise.race([
      refresh(cause),
      new Promise((_, rej) => setTimeout(() => rej(new Error('slow-rpc')), COLD_WAIT_MS)),
    ]);
    res.json({ ...data, ageMs: 0, refreshing: false });
  } catch (err) {
    if (err.message === 'slow-rpc') {
      // The read is still running and will populate the cache. Tell the client
      // to come back rather than holding the connection open.
      return res.status(202).json({ reading: true, retryInMs: 2500 });
    }
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.post('/api/cause/:id/receipt', async (req, res) => {
  const cause = findCause(req.params.id);
  if (!cause) return res.status(404).json({ error: 'no such cause' });
  try {
    // Build the receipt from the same cached read the ledger view is showing,
    // so the spoken numbers match the numbers on screen and the button does not
    // sit for fifteen seconds re-reading a rate-limited endpoint.
    const snapshot = responses.get(cause.id) || (await refresh(cause));
    const { ledger, metrics: m, balanceSol } = snapshot;
    const narrative = await narrate(cause, ledger, m, balanceSol);
    const script = receiptScript(cause, m, narrative.summary);
    const audio = await speak(script, receiptsDir, `${cause.id}-${Date.now()}.mp3`);
    res.json({ narrative, audio, metrics: m, rowsUsed: ledger.length });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, async () => {
  report();
  console.log(`Openhand listening on http://localhost:${PORT}`);

  // Warm the signature cache at boot so the first visitor is not left waiting
  // on a cold read from a rate-limited public RPC.
  for (const c of loadCauses()) {
    try {
      const data = await readCause(c);
      responses.set(c.id, data);
      console.log(`  cached ${data.ledger.length} transactions for ${c.id}`);
    } catch (err) {
      console.log(`  could not pre-read ${c.id}: ${String(err.message || err).slice(0, 90)}`);
    }
  }
  console.log('');
});
