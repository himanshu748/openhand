import {speak} from '../voice.js';
export const transcriptionConfigured=()=>Boolean(process.env.ELEVENLABS_API_KEY&&process.env.ELEVENLABS_STT_ENABLED==='true');
export async function transcribe(bytes,type){
  if(!transcriptionConfigured())throw Object.assign(new Error('Voice transcription is not enabled yet. You can type your contribution.'),{status:503});
  const form=new FormData();form.set('model_id','scribe_v2');form.set('tag_audio_events','false');form.set('diarize','false');
  const ext=type.includes('mp4')?'m4a':type.includes('wav')?'wav':type.includes('mpeg')?'mp3':'webm';
  form.set('file',new Blob([bytes],{type}),`contribution.${ext}`);
  let r;try{r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY},body:form,signal:AbortSignal.timeout(30000)});}catch{throw Object.assign(new Error('Transcription timed out. Try a shorter recording or type your answer.'),{status:502});}
  if(!r.ok)throw Object.assign(new Error(r.status===401||r.status===403?'The ElevenLabs key does not have usable transcription access. You can type your answer.':'ElevenLabs could not transcribe this recording. Check the credit limit or type your answer.'),{status:502});
  const data=await r.json();if(typeof data.text!=='string'||!data.text.trim())throw Object.assign(new Error('No speech was detected. Try again or type your answer.'),{status:400});
  return {text:data.text.trim().slice(0,3000),source:'elevenlabs',language:data.language_code};
}
export async function speakChecked(text){const audio=await speak(text.slice(0,1800));return audio;}
