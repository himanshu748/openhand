// Scroll reveal through IntersectionObserver. No scroll listeners anywhere.
// The hidden state is only opted into when the observer exists, and a timeout
// reveals everything regardless, so content can never be stranded invisible.
const reveals = [...document.querySelectorAll('.rv')];
const showAll = () => reveals.forEach((el) => el.classList.add('in'));

if ('IntersectionObserver' in window && reveals.length) {
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }),
    { threshold: 0.16 }
  );
  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    io.observe(el);
  });
  setTimeout(showAll, 2500);
}

// The nav hairline appears only once the page has actually moved.
const nav = document.getElementById('nav');
const sentinel = document.createElement('div');
sentinel.setAttribute('aria-hidden', 'true');
document.body.prepend(sentinel);
new IntersectionObserver(([e]) => nav.classList.toggle('stuck', !e.isIntersecting)).observe(sentinel);

// Dust-sized transfers would render as 0.0000 at four places, which reads as a
// bug rather than as a small number.
const amount = (n) => (n > 0 && n < 0.0001 ? n.toFixed(6) : n.toFixed(4));

const ago = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 5) return 'just now';
  if (s < 90) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
};

// The server answers 202 while a cold read is still running, rather than
// holding the connection open on a slow RPC.
async function readCause(tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch('/api/cause/winter-coats');
    const d = await res.json();
    if (res.status !== 202) return d;
    await new Promise((r) => setTimeout(r, d.retryInMs || 2500));
  }
  throw new Error('the network is not answering');
}

// Hero preview reads the real cause from chain. Never a mock.
(async () => {
  const badge = document.getElementById('heroBadge');
  const rowsEl = document.getElementById('heroRows');
  try {
    const d = await readCause();
    if (d.error) throw new Error(d.error);

    document.getElementById('heroBalance').textContent = `${d.balanceSol.toFixed(3)} SOL`;
    // Say how old the read is. A cached number presented as a live one would
    // undercut the whole point of the page.
    badge.textContent = `read ${ago(d.ageMs || 0)}`;

    document.getElementById('proofBalance').textContent = `${d.balanceSol.toFixed(3)} SOL`;
    document.getElementById('proofLink').href = d.cause.explorer;

    const rows = d.ledger.slice(0, 5);
    rowsEl.innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
              <td class="dir ${r.kind === 'donation' ? 'in' : 'out'}">${r.kind === 'donation' ? 'IN' : 'OUT'}</td>
              <td class="mono tnum">${amount(r.amountSol)}</td>
              <td><a class="sig mono" href="${r.explorer}" target="_blank" rel="noopener">${r.signature.slice(0, 10)}</a></td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="3" class="muted" style="border-top:1px solid var(--line-soft)">No transactions on this wallet yet.</td></tr>';
  } catch (err) {
    badge.textContent = 'network unreachable';
    badge.className = 'badge fb';
    rowsEl.innerHTML = `<tr><td colspan="3" class="muted" style="border-top:1px solid var(--line-soft)">${err.message}</td></tr>`;
  }
})();
