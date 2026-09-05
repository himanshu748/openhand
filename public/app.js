const CAUSE_ID = 'winter-coats';
const $ = (id) => document.getElementById(id);
const sol = (n) => `${Number(n).toFixed(3)} SOL`;

// Dust-sized transfers would render as 0.0000 at four places, which reads as a
// bug rather than as a small number.
const amount = (n) => (n > 0 && n < 0.0001 ? n.toFixed(6) : n.toFixed(4));

let state = {};

const when = (ms) =>
  ms
    ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'unknown';

function renderStages() {
  const m = state.metrics || {};
  const stages = [
    {
      name: 'Solana',
      live: true,
      text: `${(state.ledger || []).length} confirmed transactions read directly from devnet. The balance is asked of the chain on every load and never stored here.`,
    },
    {
      name: 'Snowflake',
      live: m.source === 'snowflake',
      text:
        m.source === 'snowflake'
          ? 'Chain events ingested, and the seven accountability metrics computed in the warehouse.'
          : 'Running the same seven metrics locally. Set the Snowflake credentials to compute them in the warehouse.',
      sql: m.sql,
    },
    {
      name: 'Google AI',
      live: state.narrative?.source === 'gemini',
      text: 'Turns the ledger into plain language, and may only cite amounts and purposes that appear in a real row.',
    },
    {
      name: 'ElevenLabs',
      live: state.audio?.source === 'elevenlabs',
      text: 'Speaks the receipt, paced so the numbers land one at a time instead of running together.',
    },
  ];

  $('stages').innerHTML = stages
    .map(
      (s) => `<div class="stage">
        <span class="badge ${s.live ? 'live' : 'fb'}">${s.live ? 'live' : 'fallback'}</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:15px">${s.name}</div>
          <p class="small" style="margin-top:5px;line-height:1.55">${s.text}</p>
          ${s.sql ? `<details><summary>See the SQL behind these numbers</summary><pre>${s.sql.replace(/</g, '&lt;')}</pre></details>` : ''}
        </div>
      </div>`
    )
    .join('');
}

const ago = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 5) return 'just now';
  if (s < 90) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
};

// The server answers 202 while a cold read is still running rather than holding
// the connection open on a slow RPC.
async function fetchCause(tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`/api/cause/${CAUSE_ID}`);
    const d = await res.json();
    if (res.status !== 202) return d;
    $('purpose').textContent = 'Reading the chain. This wallet is busy, so it can take a moment.';
    await new Promise((r) => setTimeout(r, d.retryInMs || 2500));
  }
  return { error: 'the network is not answering' };
}

async function load() {
  const d = await fetchCause();
  if (d.error) {
    $('purpose').innerHTML = `<span style="color:var(--out)">Could not read the chain: ${d.error}</span>`;
    return;
  }
  state = { ...state, ...d };
  const m = d.metrics;

  $('title').textContent = d.cause.title;
  $('purpose').textContent = d.cause.purpose;
  $('walletLine').innerHTML =
    `Cause wallet <a class="sig mono" href="${d.cause.explorer}" target="_blank" rel="noopener">${d.cause.wallet}</a>` +
    ` <span class="muted">&middot; chain read ${ago(d.ageMs || 0)}${d.refreshing ? ', refreshing' : ''}</span>`;

  $('balance').textContent = sol(d.balanceSol);
  $('bar').style.width = `${Math.min(100, (d.balanceSol / d.cause.goalSol) * 100)}%`;
  $('goalNote').textContent = `Goal ${sol(d.cause.goalSol)}`;
  $('pct').textContent = `${m.pct_disbursed.toFixed(0)}%`;
  $('disbursedNote').textContent = `${sol(m.total_disbursed)} of ${sol(m.total_raised)} received`;
  $('unspent').textContent = m.donations_still_unspent;
  $('idleNote').textContent =
    m.days_since_last_payout === null
      ? 'No payout has ever been recorded'
      : `Last payout ${m.days_since_last_payout.toFixed(1)} days ago`;

  $('ledger').innerHTML = d.ledger.length
    ? d.ledger
        .map(
          (r) => `<tr>
            <td class="dir ${r.kind === 'donation' ? 'in' : 'out'}">${r.kind === 'donation' ? 'IN' : 'OUT'}</td>
            <td class="mono tnum">${amount(r.amountSol)}</td>
            <td class="muted">${when(r.blockTime)}</td>
            <td class="muted">${r.memo || (r.kind === 'payout' ? 'purpose not recorded' : '')}</td>
            <td><a class="sig mono" href="${r.explorer}" target="_blank" rel="noopener">${r.signature.slice(0, 10)}</a></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="muted">No transactions on this wallet yet.</td></tr>';

  renderStages();
}

$('makeReceipt').onclick = async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Building from the ledger';
  try {
    const r = await (await fetch(`/api/cause/${CAUSE_ID}/receipt`, { method: 'POST' })).json();
    state = { ...state, ...r };
    const verdict = r.narrative.droppedClaims
      ? `<span class="badge fb">${r.narrative.droppedClaims} claim discarded</span>`
      : '<span class="badge live">every claim matched a transaction</span>';
    $('receipt').innerHTML = `
      <p class="body" style="margin-top:20px;font-size:15px;color:var(--ink)">${r.narrative.summary}</p>
      <div style="margin-top:14px">${verdict}</div>
      ${
        r.audio.url
          ? `<audio controls src="${r.audio.url}"></audio>`
          : `<p class="small" style="margin-top:14px">Audio unavailable: ${r.audio.reason}</p>`
      }
      <details style="margin-top:14px"><summary>See the spoken script</summary><pre>${r.audio.script.replace(/</g, '&lt;')}</pre></details>`;
    renderStages();
  } catch (err) {
    $('receipt').innerHTML = `<p class="small" style="color:var(--out);margin-top:16px">${err.message}</p>`;
  }
  btn.disabled = false;
  btn.textContent = 'Generate receipt';
};

$('donate').onclick = async () => {
  const note = $('donateNote');
  if (!window.solana?.isPhantom) {
    note.textContent = 'No Phantom wallet found. Install it and switch the network to devnet.';
    return;
  }
  try {
    const { solanaWeb3 } = window;
    await window.solana.connect();
    const from = window.solana.publicKey;
    const conn = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
    const tx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: new solanaWeb3.PublicKey(state.cause.wallet),
        lamports: 0.05 * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );
    tx.feePayer = from;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    const signed = await window.solana.signAndSendTransaction(tx);
    note.innerHTML = `Sent. <a class="sig mono" href="https://explorer.solana.com/tx/${signed.signature}?cluster=devnet" target="_blank" rel="noopener">Check it on the explorer</a>. Refreshing the ledger.`;
    await conn.confirmTransaction(signed.signature, 'confirmed');
    await load();
  } catch (err) {
    note.innerHTML = `<span style="color:var(--out)">${err.message}</span>`;
  }
};

load();
