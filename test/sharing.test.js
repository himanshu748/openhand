import test from 'node:test';
import assert from 'node:assert/strict';
import {questionLink, entryFromLink, answerHandout} from '../public/passiton/sharing.js';
import {questions, languages, source, sourceVersion} from '../lib/passiton/catalog.js';

test('shared navigation selects the intended language and reading mode without granting actions', () => {
  const catalog = {questions, languages};
  assert.deepEqual(entryFromLink('?question=documents&language=hi&mode=fund&reviewToken=secret', catalog), {
    questionId: 'documents', language: 'hi', mode: 'ask',
  });
  assert.equal(entryFromLink('?question=unknown&language=en', catalog), null);
  assert.deepEqual(entryFromLink('?question=documents&language=unknown', catalog), {
    questionId: 'documents', language: 'en', mode: 'ask',
  });
});

test('public links exclude any current URL token and preserve question and language', () => {
  const url = questionLink('https://example.org/app?sessionToken=secret#private', 'provisional', 'hi');
  assert.equal(url, 'https://example.org/app?question=provisional&language=hi');
});

test('offline answers retain Hindi, exact evidence, demo status and staleness notice without proofs', () => {
  const quote = source.sections[1].text;
  const content = answerHandout({question:questions[0], language:'hi', languageName:'Hindi', source, sourceVersion,
    url:'https://example.org/app?question=provisional&language=hi',
    answer:{reviewedAt:Date.UTC(2026,8,6),sessionId:'private-session',reviewToken:'private-proof',claims:[{text:'अपनी नवीनतम उपलब्ध अंकतालिका के साथ आवेदन करें।',sectionId:'S2',title:'§2 · Provisional applications',quote}]},
  });
  assert.ok(content.includes('अपनी नवीनतम उपलब्ध अंकतालिका'));
  assert.ok(content.includes(quote));
  assert.ok(content.includes('Section 2 · Provisional applications'));
  assert.ok(content.includes(sourceVersion));
  assert.ok(content.includes('FICTIONAL DEMO'));
  assert.ok(content.includes('not independently verified'));
  assert.ok(content.includes('does not update'));
  assert.ok(!content.includes('private-session') && !content.includes('private-proof'));
});
