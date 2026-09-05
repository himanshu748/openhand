import {createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
const localKey=randomBytes(32).toString('hex');
function key(){if(process.env.PASSITON_SIGNING_KEY)return process.env.PASSITON_SIGNING_KEY;if(process.env.VERCEL)throw Object.assign(new Error('Review signing is not configured.'),{status:503});return localKey;}
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function issue(kind,data,seconds=86400){const body=Buffer.from(JSON.stringify({kind,data,exp:Math.floor(Date.now()/1000)+seconds})).toString('base64url');return `${body}.${createHmac('sha256',key()).update(body).digest('base64url')}`;}
export function verify(token,kind){
  const invalid=()=>Object.assign(new Error('This review evidence is invalid or expired. Check the contribution again.'),{status:400});
  if(typeof token!=='string'||token.length>28000)throw invalid();
  const [body,signature,...extra]=token.split('.');if(extra.length||!body||!signature)throw invalid();
  const expected=createHmac('sha256',key()).update(body).digest();const supplied=Buffer.from(signature,'base64url');
  if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))throw invalid();
  let parsed;try{parsed=JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw invalid();}
  if(parsed.kind!==kind||!Number.isFinite(parsed.exp)||parsed.exp<=Date.now()/1000)throw invalid();return parsed.data;
}
