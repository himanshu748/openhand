import 'dotenv/config';

const integrations = [
  {
    key: 'solana',
    label: 'Solana',
    role: 'on-chain truth: balances and ledger rows',
    vars: ['SOLANA_RPC_URL'],
    optional: true,
    note: 'defaults to public devnet RPC when unset',
  },
  {
    key: 'gemini',
    label: 'Google AI',
    role: 'plain-language narrative grounded in the ledger rows',
    vars: ['GOOGLE_API_KEY'],
    optional: false,
  },
  {
    key: 'elevenlabs',
    label: 'ElevenLabs',
    role: 'spoken donor receipt',
    vars: ['ELEVENLABS_API_KEY'],
    optional: false,
  },
];

export function status() {
  return integrations.map((i) => {
    const missing = i.vars.filter((v) => !process.env[v]);
    return { ...i, missing, live: missing.length === 0 };
  });
}

export function report() {
  const rows = status();
  console.log('\nPass It On integration status');
  for (const r of rows) {
    if (r.live) {
      console.log(`  LIVE      ${r.label.padEnd(12)} ${r.role}`);
    } else if (r.optional) {
      console.log(`  DEFAULT   ${r.label.padEnd(12)} ${r.note}`);
    } else {
      console.log(`  FALLBACK  ${r.label.padEnd(12)} set ${r.missing.join(', ')} to run this for real`);
    }
  }
  console.log('');
  return rows;
}

export const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const PORT = Number(process.env.PORT || 3000);
