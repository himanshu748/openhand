import {sectionTitle} from './labels.js';

// Only public navigation belongs in a shared URL. Never include local proofs,
// transcripts, session tokens or a sponsor's wallet details.
export function questionLink(origin, questionId, language) {
  const url = new URL('/app', origin);
  url.searchParams.set('question', questionId);
  url.searchParams.set('language', language);
  return url.href;
}

export function entryFromLink(search, catalog) {
  const params = new URLSearchParams(search);
  const questionId = params.get('question');
  const language = params.get('language');
  const question = catalog.questions.find(q => q.id === questionId);
  if (!question) return null;
  return {questionId, language: Object.hasOwn(catalog.languages, language) ? language : question.language, mode: 'ask'};
}

export function answerHandout({question, language, languageName, answer, source, sourceVersion, url}) {
  const reviewDate = new Date(answer.reviewedAt).toISOString().slice(0, 10);
  return [
    'PASS IT ON', question.title, `Answer language: ${languageName} (${language})`, '',
    'FICTIONAL DEMO. This is not a real scholarship or application service.',
    'Checked in the demo reviewer role, not independently verified.', '',
    ...answer.claims.flatMap(c => [c.text, '', `${sectionTitle(c.title || c.sectionId)} — supporting source:`, `“${c.quote}”`, '']),
    `Handbook: ${source.title}`, `Reviewed: ${reviewDate}`, `Source version: ${sourceVersion}`, '',
    'This downloaded copy does not update. Open the link for the current shared answer:', url, '',
  ].join('\n');
}
