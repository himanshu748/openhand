import {createPrivateKey,createPublicKey,createHash,sign,randomUUID} from 'node:crypto';
import {questions,sourceVersion} from './catalog.js';
export function warehouseConfigured(){return Boolean(process.env.SNOWFLAKE_ACCOUNT&&(process.env.SNOWFLAKE_TOKEN||(process.env.SNOWFLAKE_USER&&process.env.SNOWFLAKE_PRIVATE_KEY)));}
function auth(){
  if(process.env.SNOWFLAKE_TOKEN)return {token:process.env.SNOWFLAKE_TOKEN,type:'PROGRAMMATIC_ACCESS_TOKEN'};
  const privateKey=createPrivateKey(process.env.SNOWFLAKE_PRIVATE_KEY.replace(/\\n/g,'\n'));
  const publicKey=createPublicKey(privateKey).export({type:'spki',format:'der'});
  const fp='SHA256:'+createHash('sha256').update(publicKey).digest('base64');
  const account=(process.env.SNOWFLAKE_JWT_ACCOUNT||process.env.SNOWFLAKE_ACCOUNT).split('.')[0].toUpperCase();
  const name=`${account}.${process.env.SNOWFLAKE_USER.toUpperCase()}`,now=Math.floor(Date.now()/1000);
  const body=[{alg:'RS256',typ:'JWT'},{iss:`${name}.${fp}`,sub:name,iat:now,exp:now+300}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return {token:`${body}.${sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url')}`,type:'KEYPAIR_JWT'};
}
export async function sql(statement,values=[],options={}){
  if(!warehouseConfigured()&&!options.fetch)throw new Error('Snowflake is not configured.');
  const account=process.env.SNOWFLAKE_ACCOUNT||'test';if(!/^[a-zA-Z0-9.-]+$/.test(account))throw new Error('Invalid Snowflake account.');
  const base=`https://${account}.snowflakecomputing.com`,a=options.auth||auth();
  const headers={Authorization:`Bearer ${a.token}`,'X-Snowflake-Authorization-Token-Type':a.type,'content-type':'application/json','User-Agent':'PassItOn/1.0'};
  const body={statement,timeout:10,database:process.env.SNOWFLAKE_DATABASE||'PASSITON',schema:process.env.SNOWFLAKE_SCHEMA||'PUBLIC',warehouse:process.env.SNOWFLAKE_WAREHOUSE||'PASSITON_WH',role:process.env.SNOWFLAKE_ROLE||'PASSITON_APP',bindings:Object.fromEntries(values.map((v,i)=>[i+1,{type:'TEXT',value:String(v)}]))};
  const request=options.fetch||fetch;
  const deadline=Date.now()+12000;
  const signal=()=>AbortSignal.timeout(Math.max(1,deadline-Date.now()));
  let r=await request(`${base}/api/v2/statements?requestId=${randomUUID()}`,{method:'POST',headers,body:JSON.stringify(body),signal:signal()});
  let data=await r.json();
  for(let i=0;r.status===202&&i<8;i++){
    if(!/^\/api\/v2\/statements\/[a-f0-9-]+(?:\?.*)?$/i.test(data.statementStatusUrl||''))throw new Error('Invalid statement status URL.');
    if(!options.fetch)await new Promise(resolve=>setTimeout(resolve,700));
    r=await request(base+data.statementStatusUrl,{headers,signal:signal()});data=await r.json();
  }
  if(!r.ok||r.status===202||data.code&&data.code!=='090001')throw new Error('Snowflake could not complete the query.');
  if(data.resultSetMetaData?.numRows>1000)throw new Error('Result set exceeds the demo limit.');
  const columns=data.resultSetMetaData?.rowType?.map(c=>c.name.toLowerCase())||[];
  return {rows:(data.data||[]).map(row=>Object.fromEntries(columns.map((name,i)=>[name,row[i]]))),statementHandle:data.statementHandle};
}
export async function recordEvent(event,context={}){
  if(!warehouseConfigured())return {source:'local',saved:false,reason:'Snowflake is not configured. This browser keeps the demo record.'};
  try{
    const result=await sql('MERGE INTO PASSITON_EVENTS t USING (SELECT ? AS id, PARSE_JSON(?) AS payload) s ON t.ID=s.id WHEN NOT MATCHED THEN INSERT (ID, PAYLOAD, CREATED_AT) VALUES (s.id, s.payload, CURRENT_TIMESTAMP())',[event.id,JSON.stringify({...event,sourceVersion:context.sourceVersion||sourceVersion})]);
    return {source:'snowflake',saved:true,statementHandle:result.statementHandle};
  }catch{return {source:'snowflake',saved:false,reason:'The warehouse write failed. This record is only in your browser; it has not been shared.'};}
}
export const COVERAGE_SQL=`WITH requests AS (
 SELECT PAYLOAD:questionId::STRING question_id, PAYLOAD:language::STRING language,
 COUNT(DISTINCT PAYLOAD:sessionId::STRING) requests
 FROM PASSITON_EVENTS WHERE PAYLOAD:type::STRING='question' AND PAYLOAD:sourceVersion::STRING=? GROUP BY 1,2
), reviewed AS (
 SELECT PAYLOAD:questionId::STRING question_id, PAYLOAD:language::STRING language,
 COUNT(DISTINCT PAYLOAD:contributionId::STRING) reviewed
 FROM PASSITON_EVENTS WHERE PAYLOAD:type::STRING='review' AND PAYLOAD:sourceVersion::STRING=? GROUP BY 1,2
)
SELECT q.ID question_id, l.LANGUAGE language, COALESCE(r.requests,0) requests,
 COALESCE(a.reviewed,0) reviewed, IFF(COALESCE(a.reviewed,0)=0,COALESCE(r.requests,0),0) unmet_requests
FROM PASSITON_QUESTIONS q CROSS JOIN (SELECT 'en' LANGUAGE UNION ALL SELECT 'hi') l
LEFT JOIN requests r ON r.question_id=q.ID AND r.language=l.LANGUAGE
LEFT JOIN reviewed a ON a.question_id=q.ID AND a.language=l.LANGUAGE
ORDER BY unmet_requests DESC, requests DESC, q.ID, l.LANGUAGE`;
export function coverageQuery(){
  return COVERAGE_SQL.replace('FROM PASSITON_QUESTIONS q', 'FROM (SELECT value:id::STRING ID FROM TABLE(FLATTEN(INPUT=>PARSE_JSON(?)))) q');
}
export async function coverage(context={}){
  if(!warehouseConfigured())return {source:'local',reason:'Snowflake is not configured. Counts below describe this browser only.',rows:[]};
  try{const result=await sql(coverageQuery(),[context.sourceVersion||sourceVersion,context.sourceVersion||sourceVersion,JSON.stringify((context.questions||questions).map(q=>({id:q.id})))]);return {source:'snowflake',statementHandle:result.statementHandle,rows:result.rows.map(r=>({...r,requests:Number(r.requests),reviewed:Number(r.reviewed),unmet_requests:Number(r.unmet_requests)}))};}
  catch{return {source:'unavailable',reason:'Snowflake is configured but the coverage query failed. Local activity remains available.',rows:[]};}
}
