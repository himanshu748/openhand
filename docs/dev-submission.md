---
title: Pass It On: give someone an answer they can pass on
published: false
tags: devchallenge, weekendchallenge
---

*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Pass It On lets a volunteer contribute an explanation, check it against a handbook, and leave a reviewed answer for the next person asking the same question. People can read or hear that answer in English or Hindi without connecting a wallet.

The contribution is the explanation. Someone who understands a confusing rule can give their time and knowledge, and the answer stays available beyond that conversation.

The demo uses a fictional scholarship handbook. One question asks whether a student can apply before their final results arrive. The deliberately wrong example says they must wait and gives the wrong deadline. Gemini flags both mistakes, asks for a correction, and attaches source excerpts to the revised answer. A person then compares those claims with the handbook before sharing it.

Visitors can try that reviewer role themselves. It is labelled as a demo role; approval does not imply an independent expert checked the answer. The scholarship is fictional, and the app does not accept real applications.

## Demo

[Open Pass It On](https://openhand-eta.vercel.app/app) or [start with the correction example](https://openhand-eta.vercel.app/app?example=correction).

Try this without a wallet:

1. Select the provisional-application question and English or Hindi. Open Contribute and choose the incorrect example.
2. Check the contribution. Read the correction request and compare it with the handbook.
3. Use the corrected example and check again. Open Review, inspect the quoted source, and complete both acknowledgements.
4. Return to Questions. Open the app in a separate browser session, select the same question and language, and read or listen to the shared answer.

The live audit completed this correction, review, storage, and retrieval flow, including spoken Hindi playback. Transcription was tested with generated sample audio; recording through an actual device microphone remains unverified.

An optional sponsor step uses Solana devnet. [This finalized test transfer](https://explorer.solana.com/tx/5dufRyjkreVxLzKd9dqJpSuSmiHooLVyq2MmWUXHSN9PH9zckCGCWD5AkoDsPXFX7AG3BFnGu6pkQDeVP4pgcftX?cluster=devnet) paid 0.001 test SOL to the demo contributor. Its memo identifies the approved contribution. Test SOL has no monetary value.

## Code

[GitHub repository](https://github.com/himanshu748/openhand)

The repository still has its original name, Openhand. The first version was a giving ledger; Pass It On became the main experience during this challenge. The ledger remains at `/ledger`.

[The usability audit](https://github.com/himanshu748/openhand/blob/main/design-qa.md) records the live checks and fixes. [Snowflake evidence](https://github.com/himanshu748/openhand/blob/main/docs/snowflake-live-verification.json) records successful persistence, repeat-request handling, and shared-answer retrieval. The current automated suite has 30 passing tests. Those tests use injected providers; live-provider checks are recorded separately.

## How I Built It

I kept the app small: Express on Node.js, browser JavaScript, and a Vercel deployment. Claude and Codex helped with implementation, UI changes, testing, and writing.

ElevenLabs handles the spoken exchange. It reads the question, transcribes a recorded response, and speaks the follow-up that Gemini produces. A contributor can edit the transcript before checking it. Readers can also listen to a reviewed answer. This uses speech and transcription APIs in a custom interview loop.

Gemini compares the explanation with the supplied handbook and returns claims, supporting quotes, or a request for correction. The server checks that each quote occurs in the source. That catches invented excerpts, but it cannot establish that every interpretation is correct. Human review remains a separate step.

Snowflake stores anonymous question activity and approved demo answers. Its coverage query joins demand with reviewed answers by question, language, and source version. That gives volunteers a way to choose an unanswered question in the language people requested. Another session can retrieve a stored answer after the server verifies its signed review. Counts describe demo activity, not verified people helped.

Solana gives a sponsor a contribution-linked payment record. Before marking a bounty paid, the server checks finalization, sender, recipient, amount, and memo. The current demo uses a fixed recipient and a direct devnet transfer. It does not implement escrow or prevent every concurrent-payment race.

Several usability fixes came from testing the next visitor's experience. First visits now open on Questions so existing answers are visible. Refreshing restores the current stage. After approval, the app explains that sharing is complete and labels the bounty optional.

Before a real community pilot, the app needs authenticated independent reviewers, correction and removal tools, and durable abuse controls. Shared review proofs currently expire after seven days. I have not measured adoption or the number of people this would help.

## Prize Categories

Best Use of Google AI, Best Use of ElevenLabs, Best Use of Snowflake, and Best Use of Solana. Their roles are source checking, spoken contribution and playback, shared answers and demand analysis, and optional devnet sponsor payments.
