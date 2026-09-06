import {sectionTitle} from './labels.js';

// Only public navigation belongs in a shared URL. Never include local proofs,
// transcripts, session tokens or a sponsor's wallet details.
export function questionLink(origin, questionId, language, collection) {
  const url = new URL('/app', origin);
  url.searchParams.set('question', questionId);
  url.searchParams.set('language', language);
  if(collection==='open-source')url.searchParams.set('collection',collection);
  return url.href;
}

export function entryFromLink(search, catalog) {
  const params = new URLSearchParams(search);
  const questionId = params.get('question');
  const language = params.get('language');
  const question = catalog.questions.find(q => q.id === questionId);
  if (!question) return null;
  const view = params.get('view');
  const mode = ['ask', 'contribute', 'review', 'fund'].includes(view) ? view : 'ask';
  return {questionId, language: Object.hasOwn(catalog.languages, language) ? language : question.language, mode};
}

export function answerHandout({question, language, languageName, answer, source, sourceVersion, url}) {
  const starter=answer.kind==='starter';
  const reviewDate = starter?answer.preparedAt:new Date(answer.reviewedAt).toISOString().slice(0, 10);
  return [
    'PASS IT ON', question.title, `Answer language: ${languageName} (${language})`, '',
    source.fictional?'FICTIONAL DEMO. This is not a real scholarship or application service.':'Based on a real public guide. Check the target project’s own instructions.',
    starter?'Prepared starter answer. Adapted by Pass It On; not independently reviewed.':'Checked in the demo reviewer role, not independently verified.', '',
    ...answer.claims.flatMap(c => [c.text, '', `${sectionTitle(c.title || c.sectionId)} — supporting source:`, `“${c.quote}”`, '']),
    `Handbook: ${source.title}`, `${starter?'Prepared':'Reviewed'}: ${reviewDate}`, `Source version: ${sourceVersion}`, ...(source.url?[`Original guide: ${source.url}`,`Attribution: ${source.attribution}`,`License: ${source.license} (${source.licenseUrl})`,`Source checked: ${source.checkedAt}`,source.notice]:[]), '',
    'This downloaded copy does not update. Open the link for the current shared answer:', url, '',
  ].join('\n');
}
