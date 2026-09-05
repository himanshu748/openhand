-- Openhand accountability metrics.
-- These questions are unanswerable from a single chain query: they need the
-- full event history in one place, ordered, with donations matched to the
-- payouts that came after them.

WITH events AS (
  SELECT * FROM OPENHAND_EVENTS WHERE CAUSE_ID = ?
),
totals AS (
  SELECT
    SUM(IFF(KIND = 'donation', AMOUNT_SOL, 0)) AS total_raised,
    SUM(IFF(KIND = 'payout',   AMOUNT_SOL, 0)) AS total_disbursed,
    COUNT(DISTINCT IFF(KIND = 'donation', COUNTERPARTY, NULL)) AS donor_count,
    MAX(IFF(KIND = 'payout', BLOCK_TIME, NULL)) AS last_payout_at
  FROM events
),
-- For each donation, how long until the cause next moved money out.
latency AS (
  SELECT
    d.SIGNATURE,
    DATEDIFF('hour', d.BLOCK_TIME, MIN(p.BLOCK_TIME)) AS hours_to_payout
  FROM events d
  LEFT JOIN events p
    ON p.KIND = 'payout' AND p.BLOCK_TIME > d.BLOCK_TIME
  WHERE d.KIND = 'donation'
  GROUP BY d.SIGNATURE, d.BLOCK_TIME
)
SELECT
  t.total_raised,
  t.total_disbursed,
  DIV0(t.total_disbursed, t.total_raised) * 100        AS pct_disbursed,
  t.donor_count,
  DATEDIFF('day', t.last_payout_at, CURRENT_TIMESTAMP) AS days_since_last_payout,
  MEDIAN(l.hours_to_payout)                            AS median_hours_to_payout,
  COUNT_IF(l.hours_to_payout IS NULL)                  AS donations_still_unspent
FROM totals t LEFT JOIN latency l ON TRUE
GROUP BY 1,2,3,4,5;
