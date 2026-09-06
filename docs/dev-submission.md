---
title: "Pass It On: donate an explanation someone else can use"
published: true
tags: devchallenge, weekendchallenge
---

*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Pass It On lets you donate an explanation. Speak or type what a handbook means, correct it against the source, and leave a reviewed answer that someone else can read, hear, or save.

I built this around giving knowledge and time. A useful explanation should remain available when the next person asks the same question. The source needs to travel with it, too.

The first collection helps someone make their first open-source contribution. It uses selected excerpts from GitHub’s [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/), with attribution, a pinned revision, and the CC BY 4.0 license. It covers three questions: whether you need to write code, what to check before starting, and how to prepare a pull request.

You can read a prepared answer in English or Hindi as soon as you arrive, open its supporting excerpt, hear it through ElevenLabs, and save a copy with the source attached. Prepared answers are labelled as Pass It On adaptations. They do not count as community reviews. A volunteer can then contribute an explanation, correct it with Gemini, and leave a source-linked answer for the next visitor.

A student coding club could use this collection during an open-source introduction: a beginner reads or hears an answer, checks the source, and passes the link to a classmate. That is the use case I want to test with a group. I have verified the hosted workflow, but I have not measured adoption or observed an independent participant completing it.

## Demo

[![Pass It On workspace showing the real open-source guide and its attributed answer.](https://raw.githubusercontent.com/himanshu748/pass-it-on/main/docs/design/real-guide-live.png)](https://pass-it-on-himanshu.vercel.app/app?collection=open-source&question=oss-non-code&language=hi)

[Read the shared Hindi answer](https://pass-it-on-himanshu.vercel.app/app?collection=open-source&question=oss-non-code&language=hi) · [Read the English starter answer](https://pass-it-on-himanshu.vercel.app/app?collection=open-source&question=oss-non-code&language=en) · [Open the website](https://pass-it-on-himanshu.vercel.app/)

Start with the answer. Open a supporting excerpt, then select **Listen to this answer**. **Copy question link** sends the next reader to the same question and language. **Save answer** downloads the explanation, exact quotes, review or preparation date, attribution, license, source version, and return link for offline reading. The saved copy says that it does not update.

Then [try contributing](https://pass-it-on-himanshu.vercel.app/app?collection=open-source&question=oss-non-code&language=en&example=correction):

1. Check the deliberately incorrect example. It says only programmers can contribute and documentation does not count. Gemini should identify the contradiction and ask for a correction.
2. Use the corrected example and check again. Open **Review**, compare the claims with the quoted source, and complete both acknowledgements.
3. Return to **Questions**. Pass its link to a separate browser session and retrieve the shared answer there.

You can also start a spoken interview: hear the question, consent to recording, speak your response, and edit the transcript before continuing. ElevenLabs handles transcription and speech; Gemini checks the explanation and writes the follow-up.

The sponsor step works on Solana devnet. The earlier fictional-grant practice flow supplied the payment evidence: [This finalized transfer paid 0.001 test SOL](https://explorer.solana.com/tx/5dufRyjkreVxLzKd9dqJpSuSmiHooLVyq2MmWUXHSN9PH9zckCGCWD5AkoDsPXFX7AG3BFnGu6pkQDeVP4pgcftX?cluster=devnet) to the demo contributor. Its memo identifies the approved contribution. Test SOL has no monetary value. People can contribute and reuse answers whether or not a sponsor pays the bounty.

The fictional scholarship handbook remains in a separate **Practice** collection for rehearsing corrections. Its answers and payment evidence are kept separate from the real guide. Visitors can try a clearly labelled demo reviewer role in either collection; it is not independently authenticated review. The real guide is general advice, so the target project’s own contribution instructions still matter.

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

All 40 tests pass. The test suite covers collection isolation, prepared-answer attribution, proof tampering and expiry, review gates, provider failures, exact payment matching, and the sharing/export boundaries. On the hosted real-guide collection, Gemini rejected the incorrect example, accepted the correction, and returned Hindi claims with source excerpts. The demo review saved the answer to Snowflake; a separate request retrieved it without the contributor’s session. ElevenLabs played both the prepared Hindi answer and the newly reviewed answer. The live check exposed the voice key’s credit cap; after raising it within the existing free allowance, the reviewed Hindi answer played successfully. These checks were agent-operated, not independent user research. The project owner confirmed microphone recording; the earlier automated transcription check used generated sample audio.

Before opening community review to a real group, I need authenticated reviewers, correction and removal tools, and durable abuse controls. Adding a group’s own handbook is also still future work. The current bounty uses a fixed devnet recipient and a direct transfer; it is not escrow and does not guarantee exactly-once payment across simultaneous sponsors. The next useful test is a coding club trying this real guide, with a second person finding an answer without the original volunteer present.

## Prize Categories

Best Use of Google AI, Best Use of ElevenLabs, Best Use of Snowflake, and Best Use of Solana.
