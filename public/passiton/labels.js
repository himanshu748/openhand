// Pure decisions shared by the workspace UI, kept free of DOM access so they
// can be exercised directly in the test suite.

// The status line beside the question. A reviewed answer that already exists
// for this question and language must never be reported as missing.
export function statusLabel(record, sharedCount = 0) {
  const r = record || {};
  if (r.payment) return 'Bounty paid';
  if (r.pending) return 'Payment pending';
  if (r.review) return 'Reviewed in demo';
  if (r.result?.status === 'ready') return 'Ready for human review';
  if (r.result) return 'Needs a revision';
  if (sharedCount > 0) return 'Reviewed answer available';
  return 'Awaiting a contribution';
}

// Where a visitor lands. Someone arriving for the first time came to read what
// is already here; someone returning resumes the stage they left.
export function initialMode(saved = {}) {
  if (saved.mode) return saved.mode;
  return saved.records && Object.keys(saved.records).length ? 'contribute' : 'ask';
}
