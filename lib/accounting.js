export const SOL = 1_000_000_000;
export const incoming = (row) => ['donation', 'other-in'].includes(row.kind);
export const formatSol = (lamports) => (lamports / SOL).toFixed(9).replace(/\.?0+$/, '') || '0';

// Integer lamports throughout. FIFO attributes pooled funds; it does not trace
// physically distinct coins or establish delivery of goods.
export function account(rows, balanceLamports, history = {}) {
  const ordered = [...rows].sort((a, b) => a.slot - b.slot || a.order - b.order || a.id.localeCompare(b.id));
  const sum = (kind) => ordered.filter(r => r.kind === kind).reduce((n, r) => n + r.lamports, 0);
  const contributions = [], pool = [];
  let unattributedOutflow = 0;
  for (const row of ordered) {
    if (incoming(row)) {
      const lot = { id: row.id, signature: row.signature, receivedLamports: row.lamports,
        remainingLamports: row.lamports, payoutLamports: 0, feeLamports: 0, otherLamports: 0, allocations: [] };
      pool.push(lot);
      if (row.kind === 'donation') contributions.push(lot);
    } else {
      let debit = row.lamports;
      for (const lot of pool) {
        const used = Math.min(lot.remainingLamports, debit);
        if (used) {
          lot.remainingLamports -= used;
          lot[row.kind === 'payout' ? 'payoutLamports' : row.kind === 'fee' ? 'feeLamports' : 'otherLamports'] += used;
          lot.allocations.push({ eventId: row.id, signature: row.signature, kind: row.kind, lamports: used });
          debit -= used;
        }
        if (!debit) break;
      }
      unattributedOutflow += debit;
    }
  }
  const raised = sum('donation'), paid = sum('payout'), fees = sum('fee');
  const net = raised + sum('other-in') - paid - fees - sum('other-out');
  const difference = balanceLamports - net;
  const slots = new Map();
  for (const r of ordered) { if (!slots.has(r.slot)) slots.set(r.slot,new Set()); slots.get(r.slot).add(r.signature); }
  const allocationOrderKnown = [...slots.values()].every(s => s.size <= 1);
  const fullyAccounted = history.complete === true && difference === 0 && unattributedOutflow === 0;
  return {
    source: 'local', total_raised: raised / SOL, total_disbursed: paid / SOL,
    total_fees: fees / SOL, pct_disbursed: raised ? paid / raised * 100 : null,
    donor_count: new Set(ordered.filter(r => r.kind === 'donation').map(r => r.counterparty)).size,
    remaining_donations: fullyAccounted && allocationOrderKnown ? contributions.filter(l => l.remainingLamports > 0).length : null,
    remaining_donation_sol: fullyAccounted && allocationOrderKnown ? contributions.reduce((n, l) => n + l.remainingLamports, 0) / SOL : null,
    raisedLamports: raised, paidLamports: paid, feesLamports: fees,
    otherInLamports: sum('other-in'), otherOutLamports: sum('other-out'),
    expectedBalanceLamports: net, balanceLamports, differenceLamports: difference,
    fullyAccounted, allocationOrderKnown, allocationPolicy: 'FIFO; network fees consume funds separately from payouts',
    contributions: fullyAccounted && allocationOrderKnown ? contributions : [],
  };
}
