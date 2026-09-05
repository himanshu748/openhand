# Pass It On design QA

Final result: blocked

The working demo is usable at observed widths, but exact-size visual sign-off and the full four-provider acceptance gate remain blocked. Snowflake account sign-in is pending. No hackathon submission or winning claim is made.

## Source and rendered evidence

- Concept: `docs/design/passiton-concept.png`, 1536 × 1024 pixels.
- Desktop: `docs/design/passiton-desktop.png`, 1280 × 720 pixels, blank contribution state, Hindi selected, live deployment.
- Narrow layout: `docs/design/passiton-mobile.png`, captured at actual 673 × 837 pixels despite a requested 390 × 844 viewport override. This is not a phone-sized acceptance screenshot.
- Concept and desktop render were opened together for direct comparison. They have different native dimensions. No stretching or fabricated normalization was used. Strict same-size fidelity comparison is unresolved because the browser viewport override did not change the observed tab dimensions.

## Five visible surfaces

1. Header and hierarchy: paper background, forest text, serif wordmark/headline and restrained navigation preserve the concept. Active navigation has a functional underline.
2. Layout: the 27.5% question rail and adjacent editor/source columns follow the concept at desktop width. Source remains beside the input at 1280px; it stacks on narrow screens.
3. Rhythm: hero height was intentionally reduced; the workspace begins near y=272 in the observed desktop render. Both voice and check actions fit in the 720px first viewport. The shorter hero is an intentional usability change.
4. Controls: real Tabler microphone/arrow assets replace hand-drawn icons. Main actions are 48px high. Explicit focus, placeholder, caret and selection colors retain the palette. Narrow layout uses a labelled native question selector; desktop labels and all questions remain available.
5. Content and states: correction examples, human-review acknowledgments, coverage table, consent dialog and integration disclosure extend the concept using the same components. Real source text, demo role and test-SOL limits are visible. No fake activity is seeded.

## Findings and repairs

- P1 corrected-answer Gemini timeout: reduced thinking level and raised the model deadline. Live English API and Hindi browser checks now pass. Warehouse work shares a 12-second deadline so model + warehouse do not exceed the 60-second function budget under normal overhead.
- P1 misleading transcript copy: now states transcripts remain editable and edited responses need a new check; the recorded interview checks automatically after transcription.
- P2 editor too far down: compacted hero/panel spacing and replaced the long mobile rail with a question selector.
- P2 stale progress messages: successful audio and coverage actions now have completion messages.
- P2 hand-drawn icons: replaced with official Tabler 3.34.1 assets and retained MIT license.
- P2 syntax checker omitted nested modules: made recursive; full JavaScript syntax check passes.
- Impeccable detector ran once and reported degraded regex-only mode because parser modules were absent. Its two accent-border warnings were reviewed manually: the source concept explicitly uses selected-question/feedback accents, so those were retained. This scan is not a contrast or accessibility certification.
- Remaining verification: 390px phone dimensions, strict 1536px concept comparison, actual microphone permission/recording and live Snowflake read/write.

## Functional evidence

- 25 automated tests passed: source citations, tamper/expiry checks, cross-session proof rejection, review gate, SQL bindings/polling and exact transaction matching, plus legacy ledger tests.
- Live Gemini caught the intentionally incorrect application requirement and deadline; corrected English and Hindi contributions passed.
- Live ElevenLabs TTS plus STT passed using generated fictional guidance. Browser Hindi correction audio loaded and was playable. No microphone recording was fabricated.
- Live Solana transfer finalized for 0.001 test SOL, with expected recipient and contribution memo. Repeat preparation found the existing finalized payment. See `docs/live-verification.json`.
- Live browser Hindi review: button disabled before both acknowledgments, then successfully approved in the clearly labelled demo role. Coverage showed one local reviewed answer.
- Browser console inspection returned no warning/error entries for the tested live deployment.
- Snowflake remains explicitly unconfigured; displayed counts are local browser activity.

## Deployment handoff

Promoted deployment `openhand-ftx3kvjvi-himanshus-projects-acd54afd.vercel.app` to https://openhand-eta.vercel.app/app. Public app, index entry, preserved ledger and catalog returned HTTP 200. Fresh public browser loaded the final copy, switched questions successfully and reported no console warnings/errors. Source changes and evidence synced to `/Users/himanshujha/n/openhand`; no commit or push performed.

The static `/index.html` route initially bypassed Express and served the old page. Replaced the static file itself, redeployed, and verified both `/app` and `/index.html` return Pass It On with HTTP 200.

## Landing page and font correction, 5 September 2026

Latest result: blocked only on live Snowflake configuration and actual microphone capture; no strict pixel-fidelity score is claimed.

The dedicated landing page now lives at `/` and `/index.html`; `/app` remains the tool. The user objected to the serif source font, so source headings, excerpts, task headings and downstream landing sections now use system sans-serif. Brand and introductory headline retain the original serif treatment.

Source: `docs/design/landing-concept.png`. Render: `docs/design/landing-desktop.png` (native 792 × 837 at the final observed window size; initially inspected at 1280 × 720). Concept/render were opened together. Five reviewed surfaces: header and split hero; single source example with working details; sage generosity band; ruled process rows; provider roles and FAQ. Intentional differences are recorded in `docs/design/landing-spec.md`: accurate storage/payment claims, live configuration labels, and the user's sans-serif reading-font correction.

The browser viewport override previously failed, so responsive testing used an actual same-origin iframe with a 390 × 844 layout viewport. Both landing and workspace measured inner width = document scroll width = 390, with no horizontal document overflow. Landing headline height 71.67px / line-height 35.84px confirms two lines. Main CTA height 50.75px. Workspace source heading and quote computed to ui-sans-serif. See `docs/design/workspace-mobile-sans.png` and `docs/design/workspace-mobile-entry.png`; gray surrounds are the local inspection frame, not product UI. The temporary harness was removed before deployment. Full-page screenshot stitching produced duplicates and was discarded in favor of native viewport captures.

Interactions verified: expanding the source excerpt; correction-demo entry; preserving an existing contribution; mobile question selection from the preceding pass; disconnected sync gives an explicit Snowflake-not-connected notice. Landing console inspection returned no warning/error entries. Tablet hero now stacks below 900px to avoid cramped columns.

26 tests pass. Added checks cover cross-session/invalid-proof rejection on review sync, stable event IDs, ready-answer audio when no follow-up is returned, and retry after an audio-provider failure. No extra test-SOL payment was sent this turn; earlier finalized receipt evidence remains in `docs/live-verification.json`.

Snowflake login is still required. SQL schema, bound SQL API adapter, shared-answer reads and idempotent request/approved-answer sync are implemented, but they are not described as live. The landing page shows connection pending until server configuration exists.

## Snowflake connection verified, 5 September 2026

This supersedes the Snowflake blockers above. An active account now hosts PASSITON, two demo tables and PASSITON_WH (X-Small, 60-second auto-suspend). With explicit user approval, a dedicated 30-day key-pair service user received only the app role, and its private key was saved as a sensitive production environment variable in Vercel.

Deployment `openhand-4fpmuwn74-himanshus-projects-acd54afd.vercel.app` passed live SQL API authentication as PASSITON_SERVICE/PASSITON_APP. An anonymous fresh-session request persisted; replaying it counted once. An existing signed, source-checked demo review synced twice without duplicate answers, loaded through the shared library and reduced the question's unmet demand to zero. SQL statement handles and results are recorded in `docs/snowflake-live-verification.json`. The deployment was promoted to the existing public site. Actual microphone capture remains unverified; the earlier Gemini, ElevenLabs generated-audio round-trip and finalized Solana devnet evidence are unchanged.

## Wallet-free usability audit, 5 September 2026

Question put to this pass: can a stranger use this without Solana, given there is no real money? Verdict: yes for the knowledge loop, which is now proven end to end against production providers. The wallet is needed only for the optional devnet bounty.

### Verified against live production, not mocks

Run against https://openhand-eta.vercel.app with its existing configured credentials. Each step below is an observed result, not a local stub.

- Live Gemini rejected the seeded incorrect example, naming both planted faults: that students awaiting results *can* apply with a latest marksheet, and that the deadline is 30 September 2026, not 15 October 2026. Follow-up returned in Hindi.
- Live Gemini passed the corrected contribution and produced two source-linked claims.
- The demo review gate held: approve stayed disabled until both acknowledgements, then approved.
- Live Snowflake persisted question, check and review events. Notices read "Saved to Snowflake."
- A separate session with cleared storage retrieved the approved answer from Snowflake through `/knowledge/provisional/hi`, signature-verified, statement handle `01c6df0f-0002-9187-0`.
- Live ElevenLabs spoke the reviewed Hindi answer, 12 seconds, fully buffered.

No wallet was connected at any point in the above. No payment was prepared or sent.

Local checks used no credentials and are labelled as such: the local server has no provider keys, so every check there fails closed with "Gemini is not configured."

### Bugs found and fixed

1. A reviewed answer already published for the current question and language was reported as "Awaiting a contribution". The status line ignored the shared library entirely.
2. A first-time visitor landed on Contribute, so answers that had been checked, reviewed and published were invisible on arrival. First visits now open on Questions.
3. The stage was never persisted, so refreshing mid-review dropped the visitor back to Contribute. `setMode` now saves, and the stage is restored on re-entry.
4. After approval the only forward action was the bounty, implying the contribution was unfinished without a wallet. The workspace now states where the answer went and marks the devnet bounty optional.

Regression coverage added in `test/workspace-entry.test.js` over the extracted pure decisions in `public/passiton/labels.js`. 30 tests pass; `npm run check` passes.

One suspected bug was investigated and dismissed: an answer still shown after switching to English was correct, because a reviewed English answer genuinely existed.

### Not verified

Actual microphone capture. It needs a permission grant on a real device and was not exercised, so the recorded-interview path remains unproven end to end. Transcription is configured and the TTS half of the loop is verified.

Proof expiry after seven days was not observed in real time. It is covered by existing tamper and expiry tests only.


## Published-answer lifetime fix, 5 September 2026

Previously, the shared library verified stored reviews as though a reader were requesting a new action. That removed published answers after seven days. The library now verifies the signature of an already-persisted review and checks question, language, and current source version. It returns a separate one-hour reading token for playback. Payment preparation and review sync still require a valid, unexpired, session-bound review token. No new Solana payment was needed for this change.

Playback refreshes the shared reading token, and the browser renews an expired anonymous session once. Existing drafts and pending payment records survive that renewal; renewal does not transfer ownership of old action proofs.

The automated suite passes 32 tests, including a 40-day clock advance, rejection of tampered/stale-source/wrong-topic/wrong-kind records, playback after action expiry, playback-token refresh, and rejection of expired or read-only proofs by payment and sync endpoints. Syntax checks pass. These time-shifted tests use injected providers, not the production clock. Actual device microphone recording remains pending the user's sample.

The protected production candidate also returned a real Snowflake Hindi answer and ElevenLabs playback (about 196 KB). Its reading token was rejected by payment preparation, and an invalid session returned the expected renewal signal. See `docs/publication-live-verification.json`. No new payment was sent.


## Project owner confirmation and rename

The project owner reports recording is working. This supersedes the pending-user-sample checklist item; it is user confirmation, not a new agent-observed microphone recording. Earlier timestamped test evidence is preserved.

The repository is now `himanshu748/pass-it-on`, the package name is `pass-it-on`, and the public project name is Pass It On. The branded URL is https://pass-it-on-himanshu.vercel.app; the prior hosted URL remains available.
