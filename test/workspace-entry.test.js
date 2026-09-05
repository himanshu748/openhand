import test from 'node:test';
import assert from 'node:assert/strict';
import {statusLabel, initialMode} from '../public/passiton/labels.js';

// Regression: a reviewed answer retrieved from the shared library was reported
// as "Awaiting a contribution", so a visitor was told nothing existed while a
// human-reviewed answer for that exact question and language was on screen.
test('an existing reviewed answer is not reported as missing', () => {
  assert.equal(statusLabel({}, 0), 'Awaiting a contribution');
  assert.equal(statusLabel({}, 1), 'Reviewed answer available');
  assert.equal(statusLabel(undefined, 2), 'Reviewed answer available');
});

// The visitor's own progress always outranks the shared library, so a draft in
// flight is never masked by somebody else's published answer.
test('local progress outranks the shared library', () => {
  assert.equal(statusLabel({result: {status: 'ready'}}, 3), 'Ready for human review');
  assert.equal(statusLabel({result: {status: 'revise'}}, 3), 'Needs a revision');
  assert.equal(statusLabel({review: {id: 'r1'}}, 3), 'Reviewed in demo');
  assert.equal(statusLabel({pending: true}, 3), 'Payment pending');
  assert.equal(statusLabel({payment: {signature: 'sig'}}, 3), 'Bounty paid');
});

// Regression: the stage was not persisted, so refreshing mid-review dropped the
// visitor back into Contribute and lost their place.
test('a returning visitor resumes the stage they left', () => {
  assert.equal(initialMode({mode: 'review'}), 'review');
  assert.equal(initialMode({mode: 'fund', records: {}}), 'fund');
});

// Regression: a first-time visitor landed on Contribute, so answers that had
// already been reviewed and published were invisible on arrival.
test('a first-time visitor lands on the reading stage', () => {
  assert.equal(initialMode({}), 'ask');
  assert.equal(initialMode({records: {}}), 'ask');
  assert.equal(initialMode(), 'ask');
  assert.equal(initialMode({records: {'provisional:hi': {text: 'draft'}}}), 'contribute');
});
