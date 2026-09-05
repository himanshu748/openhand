import fs from 'node:fs/promises';
import path from 'node:path';

const VOICE = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

export const voiceConfigured = () => Boolean(process.env.ELEVENLABS_API_KEY);

// The receipt is paced, not dumped. Breaks force the numbers to land on their
// own rather than running together in one breath.
export function receiptScript(cause, m, summary) {
  const disbursed = `${m.pct_disbursed.toFixed(0)} percent`;
  const held =
    m.donations_still_unspent > 0
      ? `${m.donations_still_unspent} ${m.donations_still_unspent === 1 ? 'donation is' : 'donations are'} still sitting unspent.`
      : 'Every donation so far has been followed by a payout.';
  return [
    `This is your receipt from ${cause.title}.`,
    '<break time="0.6s" />',
    summary,
    '<break time="0.7s" />',
    `Of everything given, ${disbursed} has been paid out. ${held}`,
    '<break time="0.5s" />',
    'Every number you just heard has a transaction signature behind it. You can check all of them.',
  ].join(' ');
}

export async function speak(text, outDir, filename) {
  if (!voiceConfigured()) return { source: 'unavailable', reason: 'set ELEVENLABS_API_KEY to generate audio', script: text };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    return { source: 'error', reason: `ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`, script: text };
  }

  await fs.mkdir(outDir, { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(outDir, filename), buf);
  return { source: 'elevenlabs', url: `/receipts/${filename}`, bytes: buf.length, script: text };
}
