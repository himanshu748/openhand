---
title: "Pass It On: donate an explanation someone else can use"
published: true
tags: devchallenge, weekendchallenge
---

*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Pass It On lets you donate an explanation. Speak or type what a handbook means, correct it against the source, and leave a reviewed answer that someone else can read, hear, or save.

I built this around giving knowledge and time. A useful explanation should remain available when the next person asks the same question. The source needs to travel with it, too.

The public demo uses a fictional scholarship handbook. Its clearest example is a student asking, “Can I apply before my final results?” A volunteer explains the rule, Gemini checks it, and a person compares the resulting claims with the handbook. The next visitor can open that answer directly in English or Hindi. ElevenLabs reads it aloud. A downloadable copy keeps the answer and its supporting quotes together.

My proposed first pilot is a student club or volunteer group answering repeated questions about one of its guides. The live demo does not yet accept a group's own handbook, and I have not measured adoption. The contribution, correction, shared retrieval, speech, and devnet payment flows are implemented.

## Demo

[![Pass It On workspace showing an answer alongside its supporting handbook.](https://raw.githubusercontent.com/himanshu748/pass-it-on/main/docs/design/shared-answer-live.png)](https://pass-it-on-himanshu.vercel.app/app?question=provisional&language=hi)

[Read the shared Hindi answer](https://pass-it-on-himanshu.vercel.app/app?question=provisional&language=hi) · [Read it in English](https://pass-it-on-himanshu.vercel.app/app?question=provisional&language=en) · [Open the website](https://pass-it-on-himanshu.vercel.app/)

Start with the answer. Open a supporting excerpt, then select **Listen to this answer**. **Copy question link** sends the next reader to the same question and language. **Save answer** downloads the explanation, exact quotes, review date, source version, and return link for offline reading. The saved copy says that it does not update.

Then [try contributing](https://pass-it-on-himanshu.vercel.app/app?question=provisional&language=en&example=correction):

1. Check the deliberately incorrect example. It says students must wait for final results and gives the wrong deadline. Gemini should flag both claims and ask for a correction.
2. Use the corrected example and check again. Open **Review**, compare the claims with the quoted source, and complete both acknowledgements.
3. Return to **Questions**. Pass its link to a separate browser session and retrieve the shared answer there.

You can also start a spoken interview: hear the question, consent to recording, speak your response, and edit the transcript before continuing. ElevenLabs handles transcription and speech; Gemini checks the explanation and writes the follow-up.

The sponsor step works on Solana devnet. [This finalized transfer paid 0.001 test SOL](https://explorer.solana.com/tx/5dufRyjkreVxLzKd9dqJpSuSmiHooLVyq2MmWUXHSN9PH9zckCGCWD5AkoDsPXFX7AG3BFnGu6pkQDeVP4pgcftX?cluster=devnet) to the demo contributor. Its memo identifies the approved contribution. Test SOL has no monetary value. People can contribute and reuse answers whether or not a sponsor pays the bounty.

The handbook is fictional. Visitors can try the clearly labelled demo reviewer role; that is not independently authenticated review or a real scholarship service.

## Code

[GitHub repository](https://github.com/himanshu748/pass-it-on) · [Verification and known limits](https://github.com/himanshu748/pass-it-on/blob/main/docs/reuse-verification.md)

The project began as Openhand, a giving ledger, and became Pass It On during this challenge. The earlier ledger remains at `/ledger`. I used Express, browser JavaScript, and Vercel. Claude and Codex helped with implementation, design, testing, and writing.

## How I Built It

Each technology handles a specific part of the exchange:

| Technology | What it does for the person using the app |
| --- | --- |
| ElevenLabs | Lets a volunteer speak an explanation and a reader hear an answer. It also voices the correction question, so the interview can continue aloud. |
| Google AI / Gemini | Compares the explanation with the handbook, flags contradictions, and asks for corrections. It returns claims paired with exact source excerpts. |
| Snowflake | Stores approved answers for other sessions and joins question requests with reviewed answers by language and source version. Volunteers can see which questions still need an explanation. |
| Solana | Links a sponsor's devnet payment to a particular contribution through the transaction memo. The server verifies finalization, sender, recipient, and amount before marking it paid. |

I kept the source check and human review separate. The server rejects quotes that do not occur in the handbook. That catches invented excerpts, but an exact quote can still be interpreted badly. A successful AI check therefore opens review; it cannot approve an answer or authorize a payment by itself.

The next reader's experience drove the latest changes. First visits open on available answers. A direct link selects the question and language. Saved handouts carry their source and limitations. Shared links contain no session, review, or payment credentials. Hindi answer text and English source excerpts have separate language labels for assistive technology.

The test suite covers proof tampering and expiry, review gates, provider failures, exact payment matching, and the sharing/export boundaries. Live checks separately exercised Gemini, Snowflake retrieval, and Hindi audio playback. The project owner confirmed microphone recording; the earlier automated transcription check used generated sample audio.

A real group pilot still needs its own source collection, authenticated reviewers, correction and removal tools, and durable abuse controls. The current bounty uses a fixed devnet recipient and a direct transfer; it is not escrow and does not guarantee exactly-once payment across simultaneous sponsors. The next useful test is one group, one real guide, and a second person finding an answer without the original volunteer present.

## Prize Categories

Best Use of Google AI, Best Use of ElevenLabs, Best Use of Snowflake, and Best Use of Solana.
