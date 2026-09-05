const CAUSE_ID = 'winter-coats';
const $ = (id) => document.getElementById(id);
const sol = (n) => `${Number(n).toFixed(3)} SOL`;

// Dust-sized transfers would render as 0.0000 at four places, which reads as a
// bug rather than as a small number.
const amount = (n) => (n > 0 && n < 0.0001 ? n.toFixed(6) : n.toFixed(4));

// A headline figure must not round a real value down to zero while the rows
// beneath it visibly sum to something. Precision follows the magnitude.
const solPrecise = (n) => (n > 0 && n < 0.001 ? `${n.toFixed(6)} SOL` : `${n.toFixed(3)} SOL`);

const ago = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 5) return 'just now';
  if (s < 90) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
};

const when = (ms) =>
  ms
    ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'time not recorded';

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

let state = {};
let filter = 'all';

/* ---------- counting up ----------
   The figure animates from zero to the value actually read from chain. It is
   the number arriving, not a decorative loop. */
function countTo(el, target, format) {
  // Write the real value first. requestAnimationFrame is throttled in a
  // background tab, so an animation that never starts must still leave the
  // correct number on screen.
  el.textContent = format(target);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || document.hidden) return;

  const dur = 780;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = format(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = format(target);
  };
  requestAnimationFrame(step);
}

/* ---------- trace ----------
   A figure opens into the rows behind it, summed in the open so the reader can
   check the arithmetic instead of taking the total on trust. */
function renderTrace(bodyEl, rows, total, unit) {
  if (!rows.length) {
    bodyEl.innerHTML = `<p class="small">No transactions contribute to this figure yet.</p>`;
    return;
  }
  const sum = rows.reduce((a, r) => a + r.amountSol, 0);
  const agrees = Math.abs(sum - total) < 1e-9;
  bodyEl.innerHTML =
    rows
      .map(
        (r) => `<div class="trace-row">
          <a class="sig mono" href="${r.explorer}" target="_blank" rel="noopener">${r.signature.slice(0, 14)}</a>
          <span class="mono tnum">${amount(r.amountSol)}</span>
        </div>`
      )
      .join('') +
    `<div class="trace-sum"><span>${rows.length} ${rows.length === 1 ? 'transaction' : 'transactions'}</span><span class="mono tnum">${amount(sum)}</span></div>
     <p class="trace-check${agrees ? '' : ' bad'}">${
       agrees
         ? `These rows add up to the ${unit} shown above.`
         : `These rows total ${amount(sum)}, which does not match the figure above.`
     }</p>`;
}

function wireTrace(btnId, panelId) {
  const btn = $(btnId);
  const panel = $(panelId);
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    panel.dataset.open = String(!open);
  });
}
wireTrace('tracePaid', 'tracePaidPanel');
wireTrace('traceUnspent', 'traceUnspentPanel');

/* ---------- stages ---------- */
function renderStages() {
  const m = state.metrics || {};
  const stages = [
    {
      name: 'Solana',
      live: true,
      text: `${(state.ledger || []).length} confirmed transactions read directly from devnet. The balance is asked of the chain on every read and never stored here.`,
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
          ${s.sql ? `<details><summary>See the SQL behind these numbers</summary><pre>${esc(s.sql)}</pre></details>` : ''}
        </div>
      </div>`
    )
    .join('');
}

/* ---------- ledger ---------- */
function renderLedger() {
  const rows = (state.ledger || []).filter((r) => filter === 'all' || r.kind === filter);
  const body = $('ledger');

  if (!rows.length) {
    const nothingAtAll = !(state.ledger || []).length;
    body.innerHTML = `<tr><td colspan="5" style="border-top:1px solid var(--line-soft)">
      <div class="empty">
        <div class="empty-title">${nothingAtAll ? 'Nothing on this wallet yet' : 'No rows of that kind'}</div>
        <div class="empty-body">${
          nothingAtAll
            ? 'The first donation will appear here within a few seconds of confirming.'
            : 'Switch the filter above to see the rest of the ledger.'
        }</div>
      </div></td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map(
      (r, i) => `<tr class="expandable" tabindex="0" role="button" aria-expanded="false" data-i="${i}">
        <td class="dir ${r.kind === 'donation' ? 'in' : 'out'}">${r.kind === 'donation' ? 'IN' : 'OUT'}</td>
        <td class="mono tnum">${amount(r.amountSol)}</td>
        <td class="muted">${when(r.blockTime)}</td>
        <td class="muted">${esc(r.memo || (r.kind === 'payout' ? 'purpose not recorded' : ''))}</td>
        <td><a class="sig mono" href="${r.explorer}" target="_blank" rel="noopener">${r.signature.slice(0, 10)}</a></td>
      </tr>
      <tr class="detail" hidden data-detail="${i}"><td colspan="5"><div class="detail-inner">
        <div><div class="detail-k">Signature</div><div class="detail-v mono">${r.signature}</div></div>
        <div><div class="detail-k">Direction</div><div class="detail-v">${
          r.kind === 'donation' ? 'Into the cause wallet' : 'Out of the cause wallet'
        }</div></div>
        <div><div class="detail-k">Amount</div><div class="detail-v mono">${r.amountSol} SOL</div></div>
        <div><div class="detail-k">Confirmed</div><div class="detail-v">${when(r.blockTime)}</div></div>
        <div><div class="detail-k">Recorded purpose</div><div class="detail-v">${esc(r.memo || 'none recorded on chain')}</div></div>
        <div><div class="detail-k">Verify</div><div class="detail-v"><a class="sig" href="${r.explorer}" target="_blank" rel="noopener">Open on Solana Explorer</a></div></div>
      </div></td></tr>`
    )
    .join('');

  body.querySelectorAll('tr.expandable').forEach((tr) => {
    const toggle = () => {
      const detail = body.querySelector(`tr[data-detail="${tr.dataset.i}"]`);
      const open = tr.getAttribute('aria-expanded') === 'true';
      tr.setAttribute('aria-expanded', String(!open));
      detail.hidden = open;
    };
    tr.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      toggle();
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderLedger();
  });
});

/* ---------- load ---------- */
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
    $('purpose').innerHTML = `<span style="color:var(--out)">Could not read the chain: ${esc(d.error)}</span>`;
    $('balance').textContent = 'unavailable';
    $('ledger').innerHTML = `<tr><td colspan="5" style="border-top:1px solid var(--line-soft)">
      <div class="empty"><div class="empty-title">The ledger could not be read</div>
      <div class="empty-body">${esc(d.error)}</div></div></td></tr>`;
    return;
  }
  state = { ...state, ...d };
  const m = d.metrics;
  const rows = d.ledger;

  $('title').textContent = d.cause.title;
  $('purpose').textContent = d.cause.purpose;
  $('walletLine').innerHTML =
    `Cause wallet <a class="sig mono" href="${d.cause.explorer}" target="_blank" rel="noopener">${d.cause.wallet}</a>` +
    `<button class="copy" data-copy="${d.cause.wallet}">copy</button>` +
    ` <span class="muted">&middot; chain read ${ago(d.ageMs || 0)}${d.refreshing ? ', refreshing' : ''}</span>`;

  countTo($('balance'), d.balanceSol, solPrecise);
  $('bar').style.width = `${Math.min(100, (d.balanceSol / d.cause.goalSol) * 100)}%`;
  $('goalNote').textContent = `Goal ${sol(d.cause.goalSol)}`;

  // The traced figure and the displayed figure must be the same quantity, so
  // this shows the amount and relegates the percentage to the note.
  countTo($('pct'), m.total_disbursed, solPrecise);
  $('disbursedNote').textContent =
    m.total_raised === 0
      ? 'No donations are recorded yet, so there is nothing to disburse.'
      : `${m.pct_disbursed.toFixed(0)}% of the ${solPrecise(m.total_raised)} received`;

  countTo($('unspent'), m.total_raised, solPrecise);
  $('idleNote').textContent =
    `${m.donations_still_unspent} still unspent. ` +
    (m.days_since_last_payout === null
      ? 'No payout has ever been recorded.'
      : `Last payout ${m.days_since_last_payout.toFixed(1)} days ago.`);

  renderTrace($('tracePaidBody'), rows.filter((r) => r.kind === 'payout'), m.total_disbursed, 'amount paid out');
  renderTrace($('traceUnspentBody'), rows.filter((r) => r.kind === 'donation'), m.total_raised, 'total received');

  renderLedger();
  renderStages();

  document.querySelectorAll('.copy').forEach((b) =>
    b.addEventListener('click', async () => {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = 'copied';
      setTimeout(() => (b.textContent = 'copy'), 1600);
    })
  );
}

/* ---------- receipt ---------- */
$('makeReceipt').onclick = async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Building from the ledger';
  try {
    const r = await (await fetch(`/api/cause/${CAUSE_ID}/receipt`, { method: 'POST' })).json();
    if (r.error) throw new Error(r.error);
    state = { ...state, ...r };
    const verdict = r.narrative.droppedClaims
      ? `<span class="badge fb">${r.narrative.droppedClaims} claim discarded</span>`
      : '<span class="badge live">every claim matched a transaction</span>';
    $('receipt').innerHTML = `
      <p class="body" style="margin-top:20px;font-size:15px;color:var(--ink)">${esc(r.narrative.summary)}</p>
      <div style="margin-top:14px">${verdict}</div>
      ${
        r.audio.url
          ? `<audio controls src="${r.audio.url}"></audio>`
          : `<p class="small" style="margin-top:14px">Audio unavailable: ${esc(r.audio.reason)}</p>`
      }
      <details style="margin-top:14px"><summary>See the spoken script</summary><pre>${esc(r.audio.script)}</pre></details>`;
    renderStages();
  } catch (err) {
    $('receipt').innerHTML = `<p class="small" style="color:var(--out);margin-top:16px">${esc(err.message)}</p>`;
  }
  btn.disabled = false;
  btn.textContent = 'Generate receipt';
};

/* ---------- give ---------- */
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
    note.innerHTML = `<span style="color:var(--out)">${esc(err.message)}</span>`;
  }
};

load();
