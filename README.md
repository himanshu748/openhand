# Pass It On

Pass It On lets a volunteer leave an explanation that the next person can read or hear. Contribute by text or voice, correct the answer against a source, try the demo reviewer role, and share the approved answer through Snowflake. The knowledge flow works without a wallet; a sponsor can optionally fund a fixed Solana devnet bounty.

[Try the app](https://pass-it-on-himanshu.vercel.app/app) · [DEV submission](https://dev.to/himanshu_748/pass-it-on-give-someone-an-answer-they-can-pass-on-lcf) · [90-second demo script](docs/demo-script.md) · [Readiness and remaining gaps](docs/challenge-readiness.md)

This replaces Openhand’s original donation-ledger front page. The earlier ledger is still available at `/ledger`; its implementation history is in [docs/ledger-history.md](docs/ledger-history.md).

## Start with a real guide

The default app helps someone make their first open-source contribution, using [GitHub’s Open Source Guides](https://opensource.guide/how-to-contribute/) under CC BY 4.0. Read or hear answers about contributing without code, checking contribution instructions, and preparing a pull request. [Source attribution and collection boundaries](docs/open-source-guide.md).

English and Hindi prepared answers are labelled as Pass It On adaptations. They do not count as community reviews. Readers can ask Gemini follow-ups, contribute their own explanation, compare it with the source, and try the demo reviewer role. Shared answers and demand remain scoped to this source in Snowflake. Sponsor payments remain on Solana devnet.

[Open the real guide](https://pass-it-on-himanshu.vercel.app/app?collection=open-source) · [Practice the fictional correction loop](https://pass-it-on-himanshu.vercel.app/app?collection=practice&question=provisional&language=en&example=correction)

## The fictional practice collection

The Asha Learning Grant handbook is **fictional, authored demo material**. There is no real scholarship, application portal, eligibility decision, or cash bounty. Review is an explicitly labelled demo role that visitors can try; it is not independently authenticated review.

1. In **Questions**, request a reviewed answer in English or Hindi, or ask Gemini a new question about the selected topic. A generated draft stays labelled as not human-reviewed.
2. In **Contribute**, type an explanation or start a spoken interview. ElevenLabs reads the question, transcribes a recording, and speaks Gemini’s follow-up. Recordings last at most 45 seconds. Transcripts remain editable.
3. Try the incorrect provisional-application example. Gemini must identify the incorrect requirement and date, and ask for correction. The server validates every quoted excerpt against the exact source text. A failed check cannot unlock review.
4. Correct the contribution. In **Review**, compare its claims and excerpts, then explicitly acknowledge source checking and the demo reviewer role. Signed evidence binds the checked contribution, language, source version, and demo session.
5. In **Funding**, a sponsor using Phantom signs a fixed **0.001 devnet SOL** transfer to the dedicated demo contributor. The transaction includes the contribution hash in its memo. The app records the signature before submission and only marks paid after finalized chain verification of signer, sender, recipient, amount, and memo.

The payment is a direct transfer, not escrow. No wallet private key is deployed. Test SOL has no monetary value. Payment does not establish answer correctness.

## Pass an answer to someone else

A shared question link opens the right question and language in Questions, even when a returning reader last used another stage. For example: [read the shared Hindi answer](https://pass-it-on-himanshu.vercel.app/app?question=provisional&language=hi). The link contains no session, review or payment token.

Use **Copy question link** to pass the current shared answer on. **Save answer** downloads a UTF-8 text handout containing the claims, exact source excerpts, review date, source version, demo-role notice and return link. It works offline after downloading; saved copies do not update. Neither control publishes private drafts or grants review/payment permission.

## What each technology does

- **Gemini:** source comparison, structured claims, multilingual explanations, and targeted follow-up questions. Semantic checks may be wrong; human review remains necessary. Provider errors fail closed and retain the draft.
- **ElevenLabs:** Scribe v2 transcription plus multilingual speech for a recorded-turn interview and spoken answers. This is a custom interview loop using Gemini, not a configured ElevenLabs Agents instance. No voice cloning.
- **Snowflake:** SQL API persistence of anonymous question/check metadata and approved demo answer proofs; a coverage query joins demand and reviews by question, language, and current source version. Shared answers load only after verifying the stored signed review. Counts represent demo sessions, not verified people.
- **Solana:** devnet sponsor payment with contribution-linked memo and finalized verification. The app blocks repeated payment when an existing finalized memo is found, and refuses to infer unpaid if recipient history exceeds its bounded lookup.

When Snowflake is unavailable, the UI explicitly shows browser-local records and counts. That is **not** a live Snowflake integration. A configured provider status does not claim a successful request.

## Run and test

Node 22 is the deployment runtime. The existing Express and vanilla ES module stack is retained.

```sh
npm ci
cp .env.example .env
npm start
npm test
npm run check
```

No credentials are needed to browse the handbook and UI. Gemini and voice operations need server credentials. Automated tests use injected providers and never spend credits or send transactions.

The tests cover integer accounting and existing ledger behavior, exact source excerpts, tampered/expired proofs, provider failures, SQL parameter binding and polling, human review gates, cross-session review rejection, and exact devnet payment matching.

## Server configuration

- `GOOGLE_API_KEY`, `GOOGLE_MODEL` (verified deployment model: `gemini-3.6-flash`). Free-tier quotas still apply.
- `ELEVENLABS_API_KEY` with Text to Speech and Speech to Text access; `ELEVENLABS_STT_ENABLED=true` only after scope configuration. Optional `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL`.
- `PASSITON_SIGNING_KEY`: independent random secret, at least 32 bytes, required on Vercel. Review authorization expires after seven days for sync and payment preparation. Already-published Snowflake answers remain readable while their signatures and current source version match. Playback uses a separate one-hour reading token that cannot authorize sync or payment. Local development uses a process-local key; restarting invalidates local proofs.
- `SOLANA_RPC_URL`: optional devnet RPC. The genesis hash is checked before payment operations. Never configure this demo for mainnet.
- Snowflake: `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_JWT_ACCOUNT` (account identifier in JWT), `SNOWFLAKE_USER`, `SNOWFLAKE_PRIVATE_KEY`, `SNOWFLAKE_DATABASE=PASSITON`, `SNOWFLAKE_SCHEMA=PUBLIC`, `SNOWFLAKE_WAREHOUSE=PASSITON_WH`, `SNOWFLAKE_ROLE=PASSITON_APP`. Alternatively a scoped `SNOWFLAKE_TOKEN` can use PAT auth under the account’s network-policy requirements.

Run [sql/passiton.sql](sql/passiton.sql) through an authorized Snowflake administrator. It creates an X-Small warehouse with 60-second auto-suspend, the demo schema, and a limited application role. Attach the role and an RSA public key to a dedicated service user. Keep the private key server-side. Do not use the user’s admin password or weaken account/network protections.

Production Snowflake was connected and verified on 5 September 2026. The dedicated service user expires after 30 days, around 5 October 2026; renew its authorized access before then to keep the shared library available. Its role can read the question catalog and read/insert demo events, with no table deletion or administrative privileges. See [live Snowflake evidence](docs/snowflake-live-verification.json) for successful request persistence, replay deduplication, approved-answer sync and coverage queries.

[lib/passiton/warehouse.js](lib/passiton/warehouse.js) contains the production query. User values use bind parameters. Only aggregate coverage and verified approved demo answers are returned to visitors; raw volunteer recordings are not retained by the app.

## Limits before organizational deployment

The open-source guide is real public material. Reviewer identity and sponsor payments are demonstration features; the practice collection is not a scholarship service. A real community deployment needs authenticated independent reviewers, consent/moderation and deletion workflows for published contributions, durable distributed rate limits, production payment/account controls, and a sustainable provider quota. The current app has per-instance request limits and a fixed devnet recipient. Direct sponsor transfers are not atomic bounty claims: two simultaneous sponsors could both pay; the demo does not claim escrow or exactly-once settlement.

Do not enter private applicant records. Recordings are sent to ElevenLabs only after the visitor opts into the recording flow; transcripts and typed text are sent to Google AI for checking. If Snowflake is connected, review acknowledgements authorize sharing the fictional approved answer in the demo collection. Local browser records survive refresh; no real identity is verified.

## Landing page and shared knowledge

The canonical site is https://pass-it-on-himanshu.vercel.app. The earlier https://openhand-eta.vercel.app address remains available. The repository is now https://github.com/himanshu748/pass-it-on; the original Openhand implementation is retained as project history.

`/` introduces the product, shows a clearly labelled fictional example, and explains each provider's role. `/app` is the working contribution flow; `/app?example=correction` loads the deliberately incorrect example only when the current draft is empty. `/ledger` preserves the earlier Openhand ledger.

The landing page reads provider configuration from the server and does not claim Snowflake is live before it is connected. The workspace's **Sync this browser** action sends local requests and signed approved answers to Snowflake after connection. Sync reuses event IDs and verifies session ownership/source version; drafts, failed checks and raw audio are not shared. Expired review proofs must be checked and reviewed again.
