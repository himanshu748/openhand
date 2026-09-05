import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const METRICS_SQL = fs.readFileSync(path.join(here, '..', 'sql', 'metrics.sql'), 'utf8');

const CREDS = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME', 'SNOWFLAKE_PASSWORD', 'SNOWFLAKE_DATABASE'];
export const snowflakeConfigured = () => CREDS.every((v) => process.env[v]);

let cached = null;
async function connect() {
  if (cached) return cached;
  let sdk;
  try {
    sdk = (await import('snowflake-sdk')).default;
  } catch {
    throw new Error('snowflake-sdk is not installed. Run: npm i snowflake-sdk');
  }
  const conn = sdk.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
  });
  await new Promise((res, rej) => conn.connect((err) => (err ? rej(err) : res())));
  cached = conn;
  return conn;
}

function execute(conn, sqlText, binds = []) {
  return new Promise((res, rej) => {
    conn.execute({ sqlText, binds, complete: (err, _s, rows) => (err ? rej(err) : res(rows)) });
  });
}

export async function ensureTable() {
  const conn = await connect();
  await execute(
    conn,
    `CREATE TABLE IF NOT EXISTS OPENHAND_EVENTS (
       SIGNATURE STRING PRIMARY KEY, CAUSE_ID STRING, KIND STRING,
       AMOUNT_SOL FLOAT, COUNTERPARTY STRING, BLOCK_TIME TIMESTAMP_NTZ, MEMO STRING)`
  );
}

export async function upsertEvents(causeId, rows) {
  const conn = await connect();
  await ensureTable();
  for (const r of rows) {
    await execute(
      conn,
      `MERGE INTO OPENHAND_EVENTS t USING (SELECT ? AS SIGNATURE) s
         ON t.SIGNATURE = s.SIGNATURE
       WHEN NOT MATCHED THEN INSERT
         (SIGNATURE, CAUSE_ID, KIND, AMOUNT_SOL, COUNTERPARTY, BLOCK_TIME, MEMO)
         VALUES (?, ?, ?, ?, ?, TO_TIMESTAMP_NTZ(?/1000), ?)`,
      [r.signature, r.signature, causeId, r.kind, r.amountSol, r.counterparty, r.blockTime, r.memo]
    );
  }
  return rows.length;
}

// Same seven metrics the SQL above computes, evaluated locally so the demo
// still runs before Snowflake credentials exist. Labelled as a fallback
// everywhere it surfaces, never presented as a Snowflake result.
function computeLocally(rows) {
  const donations = rows.filter((r) => r.kind === 'donation');
  const payouts = rows.filter((r) => r.kind === 'payout');
  const sum = (xs) => xs.reduce((a, b) => a + b.amountSol, 0);
  const raised = sum(donations);
  const disbursed = sum(payouts);
  const lastPayout = payouts.length ? Math.max(...payouts.map((p) => p.blockTime || 0)) : null;

  const latencies = donations.map((d) => {
    const next = payouts
      .filter((p) => (p.blockTime || 0) > (d.blockTime || 0))
      .sort((a, b) => a.blockTime - b.blockTime)[0];
    return next ? (next.blockTime - d.blockTime) / 3.6e6 : null;
  });
  const settled = latencies.filter((h) => h !== null).sort((a, b) => a - b);
  const median = settled.length
    ? settled.length % 2
      ? settled[(settled.length - 1) / 2]
      : (settled[settled.length / 2 - 1] + settled[settled.length / 2]) / 2
    : null;

  return {
    total_raised: raised,
    total_disbursed: disbursed,
    pct_disbursed: raised ? (disbursed / raised) * 100 : 0,
    donor_count: new Set(donations.map((d) => d.counterparty).filter(Boolean)).size,
    days_since_last_payout: lastPayout ? (Date.now() - lastPayout) / 8.64e7 : null,
    median_hours_to_payout: median,
    donations_still_unspent: latencies.filter((h) => h === null).length,
  };
}

export async function metrics(causeId, rows) {
  if (!snowflakeConfigured()) {
    return { source: 'local-fallback', sql: METRICS_SQL, ...computeLocally(rows) };
  }
  try {
    const conn = await connect();
    await upsertEvents(causeId, rows);
    const [r] = await execute(conn, METRICS_SQL, [causeId]);
    return {
      source: 'snowflake',
      sql: METRICS_SQL,
      total_raised: r.TOTAL_RAISED,
      total_disbursed: r.TOTAL_DISBURSED,
      pct_disbursed: r.PCT_DISBURSED,
      donor_count: r.DONOR_COUNT,
      days_since_last_payout: r.DAYS_SINCE_LAST_PAYOUT,
      median_hours_to_payout: r.MEDIAN_HOURS_TO_PAYOUT,
      donations_still_unspent: r.DONATIONS_STILL_UNSPENT,
    };
  } catch (err) {
    return { source: 'local-fallback', error: String(err.message || err), sql: METRICS_SQL, ...computeLocally(rows) };
  }
}
