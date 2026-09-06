# Answer reuse verification

## Real-guide production pass, 6 September 2026

Implementation `5555d65` makes an attributed, pinned selection from GitHub Open Source Guides the default collection. All 40 tests pass, including source isolation, starter-answer attribution, and proof boundaries.

- Production returned the real source catalog and six Snowflake coverage rows, initially all zero. Prepared answers were not counted as reviews.
- The incorrect non-code contribution example produced a Hindi correction request from Gemini and a saved Snowflake check. The corrected example produced two Hindi claims with exact excerpts and opened the review gate.
- An agent compared those claims with the displayed source and exercised both demo-role acknowledgements. This is an agent-operated test, not independent human review. Snowflake coverage then reported one Hindi review for that question.
- A separate HTTP client retrieved the stored answer without the contributing browser session. Another fresh session recorded a question request successfully in Snowflake. No contributor credentials were exposed in this verification.
- ElevenLabs played the prepared Hindi answer: duration 11.099 seconds, actively playing, readyState 4. Generating speech for the reviewed answer then returned unavailable twice. The text remained readable. The ElevenLabs dashboard required sign-in, so the provider-side cause remains unverified.
- The legacy practice catalog still returned its original source version and its stored Hindi answer. No new Solana payment was sent; the prior receipt belongs to the practice collection.
- The save control displayed success, but this pass did not find the new file in Downloads. Handout content, attribution, and credential exclusion passed automated tests; a completed real-guide browser download is not claimed.

`docs/design/real-guide-live.png` is an unedited production browser capture of the English prepared answer and its source on 6 September 2026. It contains public guide excerpts and no credentials.

## Earlier practice-collection pass


Verified 6 September 2026 against the production application at https://pass-it-on-himanshu.vercel.app, implementation commit `325c3db`.

## Automated checks

All 36 tests passed, followed by the nested JavaScript syntax check. New checks exercise public link construction, question/language selection, allowed navigation states, rejection of unknown navigation values, and offline handouts. The export test checks that Hindi text, exact excerpts, source version and demo/staleness notices remain present while session and review proofs remain excluded.

These tests use injected service dependencies. They do not establish live provider success or real-world adoption.

## Hosted browser checks

- Opening the English question link selected English and loaded the stored answer from Snowflake despite the browser's previous Hindi selection.
- Copy question link showed the successful copy notice. The link builder is also covered by the automated credential-exclusion test.
- Save answer created `pass-it-on-provisional-en.txt` and `pass-it-on-provisional-hi.txt` in Downloads. Both files were read from disk. They retained the actual answer, exact English source excerpt, review date, source version, fictional/demo-review notices, staleness warning and language-specific return link.
- Opening Review then refreshing retained `view=review`. An unchecked contribution still showed the successful-source-check prerequisite, without an approval control.
- The 390px mobile layout had a 390px document width: no horizontal overflow. Listen, Copy question link and Save answer remained visible and operable. Answer claims carried `lang=hi`; English excerpts carried `lang=en`.
- The desktop capture shows the English shared answer and source together. It is a screenshot of the running production application, not a mockup.

The earlier 6 September production pass separately exercised Gemini draft generation, Snowflake request persistence/shared retrieval, and ElevenLabs Hindi playback (12.07-second audio, actively playing with readyState 4). No new payment was sent for this UI change. Existing finalized devnet payment evidence remains in the submission.

## Evidence provenance

`docs/design/shared-answer-live.png` is an unedited browser viewport capture of the public production app, taken on 6 September 2026. It shows English shared guidance from the fictional Asha Learning Grant. It includes no private data or credentials. The screenshot is linked to the working app in the DEV submission.

## Limits

The earlier pass used an authored fictional handbook, now retained in the separate Practice collection. The main collection uses a real public guide. Review is a demo role, not authenticated independent review. A real group pilot still needs authenticated reviewers, correction/removal tools and durable abuse controls. No adoption, number of people helped, independently measured user completion rate or competition result is claimed. The offline file is a static copy; its link retrieves the current shared answer.
