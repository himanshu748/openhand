# Pass It On implementation spec

Concept: passiton-concept.png, generated with the built-in image-generation tool.
Primary view: question rail + contribution editor + adjacent source; four stages Ask, Contribute, Review, Fund.
Palette: paper #f7f6f2, ink #25382e, forest #245b45, sage #dfe7dc, rules #c6cbc4.
Typography: Georgia headings and brand, system sans-serif controls/body; desktop heading fluid 38–62px, section 30px, control 16px, body 17px; 1.5 body line height.
Layout: full-width quiet header, 42px desktop gutters, compact hero band (workspace begins around 272px at 1280px), 28% question rail, 72% workspace; two equal editor/source columns; 1px rules; minimal radius 4px. At <=1050px editor columns stack; at <=720px compact question selector above workspace and hero heading 36px.
Icons: microphone outline, 20px, 2px currentColor; official Tabler arrow-right assets; no imagery or branded raster assets needed.
Copy follows concept. Required functional additions: Ask question form; correction feedback; human review acknowledgement and explicit demo reviewer role; funding instructions; demand/coverage table; provider status details; source modal; audio consent and playback. These extend the same components.
All fictional content labelled. No invented visitors, impact, paid bounties, independent reviewers, or provider successes.
Operational scope: isolated browser demonstration until Snowflake configured. Review is an explicitly labelled role simulation, not authenticated independent review. Never store scholarship applicant information. Users approve each microphone recording; it is sent to ElevenLabs for transcription, text to Gemini for source comparison. Audio not retained by app.
Payment: test SOL only, fixed demo recipient and bounty amount. No production private wallet in deployment. Signed source/version/review evidence binds a proposed payment; verify finalized devnet transfer and memo before marking paid. No fake transactions or production escrow claims.

Design refinement: variance 4, motion 2, density 4. Preserve the editorial paper/forest concept. Native controls and real Tabler 3.34.1 MIT icons; no decorative imagery. Headline and controls compacted to bring voice/check actions into the 1280×720 viewport. Mobile selection replaces the tall question rail without changing questions or routes.
