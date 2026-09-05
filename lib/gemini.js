const MODEL = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

export const geminiConfigured = () => Boolean(process.env.GOOGLE_API_KEY);

const SYSTEM = `You write short, plain donor updates for a charity ledger.
Rules you cannot break:
- Every factual claim must cite the signature of the ledger row it comes from.
- Never state an amount, date or purpose that is not present in the rows given to you.
- If a row has no memo, say the purpose was not recorded. Do not guess it.
- No adjectives about impact. No thanking. Report what moved and when.
Return JSON only: {"summary": string, "claims": [{"text": string, "signature": string}]}`;

function ledgerAsFacts(rows) {
  return rows
    .map((r) => {
      const when = r.blockTime ? new Date(r.blockTime).toISOString().slice(0, 16).replace('T', ' ') : 'time unknown';
      return `signature=${r.signature} kind=${r.kind} amount=${r.amountSol.toFixed(4)} SOL when=${when} memo=${r.memo || 'none recorded'}`;
    })
    .join('\n');
}

function fallbackNarrative(cause, rows, m, balanceSol) {
  const payouts = rows.filter((r) => r.kind === 'payout');
  const parts = [];

  // The balance and the observed flows can disagree, because the ledger only
  // covers the transactions we read. Saying "received 0.000 SOL" next to a
  // wallet that visibly holds funds would read as a broken number, so the
  // mismatch is stated rather than papered over.
  const unexplained = typeof balanceSol === 'number' && m.total_raised === 0 && balanceSol > 0;
  if (unexplained) {
    parts.push(
      `${cause.title} holds ${balanceSol.toFixed(3)} SOL, but none of the transactions read here are donations into it, so the balance arrived before this ledger begins.`
    );
  } else {
    parts.push(
      `${cause.title} has received ${m.total_raised.toFixed(3)} SOL from ${m.donor_count} ${m.donor_count === 1 ? 'wallet' : 'wallets'}.`
    );
    parts.push(
      `${m.total_disbursed.toFixed(3)} SOL has been paid out, which is ${m.pct_disbursed.toFixed(0)} percent of what came in.`
    );
  }
  if (payouts.length) {
    const p = payouts[0];
    parts.push(`The most recent payout of ${p.amountSol.toFixed(3)} SOL was recorded as: ${p.memo || 'purpose not recorded'}.`);
  } else {
    parts.push('No payout has been recorded yet, so none of this money has moved on.');
  }
  return {
    source: 'template-fallback',
    summary: parts.join(' '),
    claims: payouts.slice(0, 3).map((p) => ({ text: p.memo || 'purpose not recorded', signature: p.signature })),
    droppedClaims: 0,
  };
}

export async function narrate(cause, rows, m, balanceSol) {
  if (!geminiConfigured() || rows.length === 0) return fallbackNarrative(cause, rows, m, balanceSol);

  const prompt = `Cause: ${cause.title}
Stated purpose: ${cause.purpose}

Ledger rows (the only facts you may use):
${ledgerAsFacts(rows)}

Write a donor update of at most 70 words.`;

  const res = await fetch(`${ENDPOINT(MODEL)}?key=${process.env.GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ...fallbackNarrative(cause, rows, m, balanceSol), error: `Gemini ${res.status}: ${detail.slice(0, 200)}` };
  }

  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ...fallbackNarrative(cause, rows, m, balanceSol), error: 'Gemini returned unparseable JSON' };
  }

  // Grounding gate: a claim survives only if its signature is really in the ledger.
  const known = new Set(rows.map((r) => r.signature));
  const claims = (parsed.claims || []).filter((c) => known.has(c.signature));
  return {
    source: 'gemini',
    model: MODEL,
    summary: parsed.summary || '',
    claims,
    droppedClaims: (parsed.claims || []).length - claims.length,
  };
}
