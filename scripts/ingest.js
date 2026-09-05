import fs from 'node:fs';
import { readCause } from '../server.js';
const causes=JSON.parse(fs.readFileSync(new URL('../data/causes.json',import.meta.url),'utf8'));
for(const cause of causes){const d=await readCause(cause);console.log(JSON.stringify({cause:cause.id,signatures:d.history.signaturesRead,complete:d.history.complete,reconciles:d.metrics.fullyAccounted}));}
