import {initialMode} from './labels.js';
export const KEY='passiton-demo-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
export const state={catalog:null,mode:initialMode(saved),questionId:'provisional',language:'hi',records:{},requests:{},sessionToken:null,sourceVersion:null,...saved,busy:false,recording:false,shared:[],coverage:null,providers:{}};
export const recordKey=()=>`${state.questionId}:${state.language}`;
export const current=()=>state.records[recordKey()]||(state.records[recordKey()]={text:'',history:[]});
export function save(){try{const {records,requests,sessionToken,questionId,language,sourceVersion,mode}=state;localStorage.setItem(KEY,JSON.stringify({records,requests,sessionToken,questionId,language,sourceVersion,mode}));}catch{}}
export async function api(path,body,raw,retrySession=true){
  const r=await fetch(`/api/passiton${path}`,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':raw||'application/json'}),...(state.sessionToken?{'X-Passiton-Session':state.sessionToken}:{})},...(body===undefined?{}:{body:raw?body:JSON.stringify(body)})});
  let data;try{data=await r.json();}catch{throw new Error('The server returned an unreadable response. Your draft is preserved.');}
  if(r.status===401&&data.code==='SESSION_REQUIRED'&&retrySession&&path!=='/session'){
    const fresh=await api('/session',{},undefined,false);state.sessionToken=fresh.token;save();
    return api(path,body,raw,false);
  }
  if(!r.ok)throw new Error(data.error||'The request could not finish.');return data;
}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const $=id=>document.getElementById(id);
export function notice(text,error=false,done=false){const n=$('stepNotice');n.textContent=text;n.hidden=!text;n.classList.toggle('error',error);n.classList.toggle('done',done&&!error);}
export function storageNotice(storage){state.providers.snowflake=storage?.saved?'live':storage?.source==='snowflake'?'unavailable':'not configured';return storage?.saved?'Saved to Snowflake.':storage?.reason||'Saved in this browser.';}
