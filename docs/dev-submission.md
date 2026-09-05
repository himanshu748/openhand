---
title: Pass It On: give someone an answer they can pass on
published: false
tags: devchallenge, weekendchallenge
---

*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Pass It On lets a volunteer contribute an explanation, check it against a handbook, and leave a reviewed answer for the next person asking the same question. People can read or hear that answer in English or Hindi. A sponsor can reward an approved contribution through a Solana payment linked to that answer.

The contribution is the explanation. Someone who understands a confusing rule can give their time and knowledge, and the answer stays available beyond that conversation.

The demo uses a fictional scholarship handbook. One question asks whether a student can apply before their final results arrive. The deliberately wrong example says they must wait and gives the wrong deadline. Gemini flags both mistakes, asks for a correction, and attaches source excerpts to the revised answer. A person then compares those claims with the handbook before sharing it.

Visitors can try that reviewer role themselves. It is labelled as a demo role; approval does not imply an independent expert checked the answer. The scholarship is fictional, and the app does not accept real applications.

## Demo

[Visit the hosted site](https://pass-it-on-himanshu.vercel.app/) · [Open the app](https://pass-it-on-himanshu.vercel.app/app) · [Try the correction example](https://pass-it-on-himanshu.vercel.app/app?example=correction)

A volunteer explains a rule by speaking or typing. ElevenLabs reads the question, transcribes the spoken response, and voices the follow-up. Gemini compares the explanation with the handbook, flags mistakes, and returns supporting source excerpts. The volunteer can correct the answer and check it again before a person approves it in the labelled demo reviewer role.

Snowflake stores the approved answer so another visitor can find it in the same language. That visitor can read the answer alongside its source or hear it through ElevenLabs. Snowflake also compares question requests with available reviewed answers, helping volunteers choose where to contribute next.

A sponsor can then reward the approved contribution through Solana. The demo has already completed [a finalized transfer of 0.001 devnet SOL](https://explorer.solana.com/tx/5dufRyjkreVxLzKd9dqJpSuSmiHooLVyq2MmWUXHSN9PH9zckCGCWD5AkoDsPXFX7AG3BFnGu6pkQDeVP4pgcftX?cluster=devnet). Its memo identifies the approved contribution, and the app verifies the sender, recipient, amount, and memo before marking the payment complete. Devnet SOL is test currency with no monetary value. Contributing and reading remain available whether or not a sponsor funds the answer.

## Code

[GitHub repository](https://github.com/himanshu748/pass-it-on)

The project began as Openhand, a giving ledger, and became Pass It On during this challenge. The earlier ledger remains at `/ledger`.

The repository includes [testing notes and known limits](https://github.com/himanshu748/pass-it-on/blob/main/design-qa.md), [Snowflake verification](https://github.com/himanshu748/pass-it-on/blob/main/docs/snowflake-live-verification.json), and [live shared-answer playback evidence](https://github.com/himanshu748/pass-it-on/blob/main/docs/publication-live-verification.json). The 32 automated tests use injected providers; the notes distinguish those results from live service checks, with device recording confirmed by the project owner.

## How I Built It

I kept the app small: Express on Node.js, browser JavaScript, and a Vercel deployment. Claude and Codex helped with implementation, UI changes, testing, and writing.

ElevenLabs handles the spoken exchange. It reads the question, transcribes a recorded response, and speaks the follow-up that Gemini produces. A contributor can edit the transcript and check the revised answer again. Readers can also listen to a reviewed answer. This uses speech and transcription APIs in a custom interview loop.

Gemini compares the explanation with the supplied handbook and returns claims, supporting quotes, or a request for correction. The server checks that each quote occurs in the source. That catches invented excerpts, but it cannot establish that every interpretation is correct. Human review remains a separate step.

Snowflake stores anonymous question activity and approved demo answers. Its coverage query joins demand with reviewed answers by question, language, and source version. That gives volunteers a way to choose an unanswered question in the language people requested. Another session can retrieve a stored answer after the server verifies its signed review. Counts describe demo activity, not verified people helped.

Solana gives a sponsor a contribution-linked payment record. Before marking a bounty paid, the server checks finalization, sender, recipient, amount, and memo. The current demo uses a fixed recipient and a direct devnet transfer. It does not implement escrow or prevent every concurrent-payment race.

Several usability fixes came from testing the next visitor's experience. First visits now open on Questions so existing answers are visible. Refreshing restores the current stage. After approval, the app explains that sharing is complete and labels the bounty optional.

Before a real community pilot, the app needs authenticated independent reviewers, correction and removal tools, and durable abuse controls. Published answers remain available while their source version matches. Review and payment authorization still expires after seven days; playback uses a separate, short-lived token. I have not measured adoption or the number of people this would help.

## Prize Categories

Best Use of Google AI, Best Use of ElevenLabs, Best Use of Snowflake, and Best Use of Solana. Their roles are source checking, spoken contribution and playback, shared answers and demand analysis, and contribution-linked devnet sponsor payments.
