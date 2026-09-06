# Answer reuse verification

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

The public collection still contains an authored fictional handbook. Review is a demo role, not authenticated independent review. A real group pilot needs a real source collection, authenticated reviewers, correction/removal tools and durable abuse controls. No adoption, number of people helped, independently measured user completion rate or competition result is claimed. The offline file is a static copy; its link retrieves the current shared answer.
