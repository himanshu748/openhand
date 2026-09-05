export const voiceConfigured = () => Boolean(process.env.ELEVENLABS_API_KEY);
export function receiptScript(cause, m, summary, claims = []) {
  return `Openhand devnet demonstration. ${summary} ${claims.map(c => c.text).join(' ')} Open the evidence links to inspect the transactions. This is not a tax receipt.`;
}
export async function speak(text) {
  if (!voiceConfigured()) return {source:'unavailable', reason:'ElevenLabs is not configured. The checked text is available below.', script:text};
  try {
    const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method:'POST',signal:AbortSignal.timeout(20000),
      headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 2_000_000) throw new Error('Audio too large');
    // Inline data survives serverless instance recycling and requires no public disk writes.
    return {source:'elevenlabs',url:`data:audio/mpeg;base64,${bytes.toString('base64')}`,script:text};
  } catch { return {source:'unavailable',reason:'Audio service unavailable. The checked text is still available.',script:text}; }
}
