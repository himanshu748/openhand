const $ = id => document.getElementById(id);
const CAUSE_ID = 'winter-coats';
const sol = n => `${Number(n).toFixed(9).replace(/\.?0+$/, '') || '0'} SOL`;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {donation:'IN',payout:'OUT',fee:'FEE','other-in':'OTHER IN','other-out':'OTHER OUT'};
const when = t => t ? new Date(t).toLocaleString() : 'Time unavailable';
let state, filter='all', receipt;
const direction = r => ['donation','other-in'].includes(r.kind) ? 'in' : 'out';
const evidenceLink = (r,text) => `<a class="sig mono" href="${esc(r.explorer)}" target="_blank" rel="noopener">${esc(text || r.signature.slice(0,12))}</a>`;
const rowAmount = r => sol(r.lamports / 1e9);
function wireTrace(button,panel) {
  $(button).onclick=()=>{const open=$(button).getAttribute('aria-expanded')!=='true';$(button).setAttribute('aria-expanded',String(open));$(panel).hidden=!open;$(panel).dataset.open=String(open);};
}
wireTrace('tracePaid','tracePaidPanel');wireTrace('traceUnspent','traceUnspentPanel');
function trace(id,rows,total) {
  $(id).innerHTML=rows.length ? rows.map(r=>`<div class="trace-row">${evidenceLink(r)}<span class="mono">${rowAmount(r)}</span></div>`).join('')+
    `<div class="trace-sum"><span>${rows.length} events</span><span class="mono">${sol(total/1e9)}</span></div><p class="trace-check">These transfer amounts sum to the figure above. Fees are separate.</p>` : '<p class="small">No transfers of this kind in the history read.</p>';
}
function renderLedger() {
  const rows=state.ledger.filter(r=>filter==='all'||r.kind===filter);
  $('ledger').innerHTML=rows.length ? rows.map((r,i)=>`<tr class="expandable" tabindex="0" role="button" aria-expanded="false" data-i="${i}">
    <td class="dir ${direction(r)}">${labels[r.kind]}</td><td class="mono tnum">${rowAmount(r)}</td><td class="muted">${esc(when(r.blockTime))}</td>
    <td class="muted">${esc(r.kind==='fee' ? `Network fee${r.failed ? ' (failed transaction)' : ''}` : r.memo || 'No purpose recorded')}</td><td>${evidenceLink(r)}</td></tr>
    <tr class="detail" hidden data-detail="${i}"><td colspan="5"><div class="detail-inner"><div><div class="detail-k">Event</div><div class="detail-v mono">${esc(r.id)}</div></div><div><div class="detail-k">Counterparty</div><div class="detail-v mono">${esc(r.counterparty || 'Not applicable')}</div></div><div><div class="detail-k">Evidence boundary</div><div class="detail-v">Finalized movement of test SOL. A memo is a statement by the sender; it does not prove delivery.</div></div></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty"><div class="empty-title">No events of this kind</div><div class="empty-body">Choose another filter to inspect the rest of the history.</div></div></td></tr>';
  $('ledger').querySelectorAll('.expandable').forEach(tr=>{
    const toggle=()=>{const open=tr.getAttribute('aria-expanded')!=='true';tr.setAttribute('aria-expanded',String(open));$('ledger').querySelector(`[data-detail="${tr.dataset.i}"]`).hidden=!open;};
    tr.onclick=e=>{if(!e.target.closest('a'))toggle();};tr.onkeydown=e=>{if(!e.target.closest('a')&&['Enter',' '].includes(e.key)){e.preventDefault();toggle();}};
  });
}
function renderStages() {
  const aiConfigured=state.integrations?.googleAI.configured;
  const audioConfigured=state.integrations?.elevenLabs.configured;
  const aiLive=receipt?.narrative.source==='gemini';
  const audioLive=receipt?.audio.source==='elevenlabs';
  $('stages').innerHTML=[
    ['Solana','verified',`${state.history.signaturesRead} finalized transactions inspected. Fees and unsupported balance changes are separate.`],
    ['Google AI',aiLive?'live':receipt?'text fallback':aiConfigured?'configured':'not configured',aiLive?'Gemini selected the events in this update. Every selected amount, direction, and memo passed the ledger checks.':receipt?receipt.narrative.reason || 'This update uses checked ledger facts without AI selection.':aiConfigured?'Gemini is configured. Generate a checked update to select and explain the relevant ledger events.':'AI selection is not configured. You can still generate an update from checked ledger facts.'],
    ['ElevenLabs',audioLive?'live':receipt?'audio unavailable':audioConfigured?'configured':'not configured',audioLive?'ElevenLabs generated the audio for this update. Use the player above to listen.':receipt?receipt.audio.reason || 'Audio could not be generated. The checked text remains available.':audioConfigured?'ElevenLabs is configured. Generate a checked update to create its spoken version.':'Voice is not configured. The checked text and transaction evidence remain available.'],
  ].map(([name,status,text])=>`<div class="stage"><span class="badge ${['verified','live','configured'].includes(status)?'live':'fb'}">${status}</span><div><strong>${name}</strong><p class="small" style="margin-top:6px">${esc(text)}</p></div></div>`).join('');
}
function render() {
  const d=state,m=d.metrics;
  $('title').textContent=d.cause.title;$('purpose').textContent=d.cause.purpose;
  $('walletLine').innerHTML=`Demo wallet <a class="sig mono" href="${esc(d.cause.explorer)}" target="_blank" rel="noopener">${esc(d.cause.wallet)}</a>`;
  $('balance').textContent=sol(d.balanceSol);$('pct').textContent=sol(m.total_disbursed);$('unspent').textContent=sol(m.total_raised);
  $('goalNote').textContent='Test SOL only. No real funds or charity.';
  $('bar').style.width=`${Math.min(100,d.balanceSol/d.cause.goalSol*100)}%`;
  $('disbursedNote').textContent=`${sol(m.total_fees)} in network fees, counted separately.`;
  $('idleNote').textContent=m.remaining_donations===null ? 'Donation allocation unavailable until history and balance reconcile.' : `${m.remaining_donations} contributions still have funds available (FIFO).`;
  $('readStatus').textContent=`Read ${when(d.readAt)} · finalized slot ${d.balanceSlot}${d.refreshError?' · refresh failed; showing the last successful read':''}`;
  $('reconciliation').innerHTML=`<span class="badge ${m.fullyAccounted?'live':'fb'}">${m.fullyAccounted?'Balance reconciles':'Partial or unreconciled history'}</span><p class="body" style="margin-top:12px">${sol(m.total_raised)} received − ${sol(m.total_disbursed)} transferred − ${sol(m.total_fees)} fees${m.otherInLamports?` + ${sol(m.otherInLamports/1e9)} other inflows`:''}${m.otherOutLamports?` − ${sol(m.otherOutLamports/1e9)} other outflows`:''} = ${sol(m.expectedBalanceLamports/1e9)}.</p><p class="small" style="margin-top:8px">${m.fullyAccounted?'This matches the independently read wallet balance.':`Unexplained difference: ${sol(m.differenceLamports/1e9)}. Totals cover only the history read.`} ${d.history.scope}</p>`;
  trace('tracePaidBody',d.ledger.filter(r=>r.kind==='payout'),m.paidLamports);trace('traceUnspentBody',d.ledger.filter(r=>r.kind==='donation'),m.raisedLamports);
  $('journey').innerHTML=m.contributions.length ? m.contributions.map(c=>{
    const event=d.ledger.find(r=>r.id===c.id);
    return `<div class="journey-row"><div><strong>${sol(c.receivedLamports/1e9)} received</strong> ${evidenceLink(event)}</div><p class="small">${sol(c.payoutLamports/1e9)} allocated to payouts · ${sol(c.feeLamports/1e9)} to fees · ${sol(c.otherLamports/1e9)} to other outflows · <strong>${sol(c.remainingLamports/1e9)} remaining</strong></p><div>${c.allocations.map(a=>evidenceLink(d.ledger.find(r=>r.id===a.eventId),`${labels[a.kind]} ${sol(a.lamports/1e9)}`)).join(' · ')}</div></div>`;
  }).join('') : '<p class="small">A donation journey appears once contributions and spending can be reconciled. No allocation is invented for missing history.</p>';
  renderLedger();renderStages();$('makeReceipt').disabled=false;$('donate').disabled=!d.cause.demo;$('checkClaim').disabled=!d.ledger.length;
}
async function load(force=false) {
  $('refresh').disabled=true;$('readStatus').textContent='Reading finalized devnet history…';
  try {
    const response=await fetch(`/api/cause/${CAUSE_ID}${force?'?refresh=1':''}`);
    const d=await response.json();if(!response.ok)throw new Error(d.error);
    if(state?.snapshotId!==d.snapshotId){receipt=null;$('receipt').replaceChildren();}
    state=d;render();
  } catch(err) {
    $('readStatus').textContent=err.message;
    if(!state){$('ledger').innerHTML='<tr><td colspan="5">Devnet is unavailable. Use Refresh chain read to retry.</td></tr>';$('balance').textContent='Unavailable';$('purpose').textContent='Could not read the demo wallet. Retry the chain read.';}
  } finally {$('refresh').disabled=false;}
}
$('refresh').onclick=()=>load(true);
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{filter=c.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',String(x===c)));if(state)renderLedger();});
$('makeReceipt').onclick=async()=>{
  $('makeReceipt').disabled=true;$('makeReceipt').textContent='Checking the update…';
  try {
    const response=await fetch(`/api/cause/${CAUSE_ID}/receipt`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({snapshotId:state.snapshotId})});
    const r=await response.json();if(!response.ok)throw new Error(r.error);receipt=r;
    $('receipt').innerHTML=`<p class="small" style="margin-top:18px">Snapshot ${esc(r.snapshotId)} · ${esc(when(r.readAt))}</p><p class="body" style="margin-top:14px">${esc(r.narrative.summary)}</p><div style="margin-top:14px"><span class="badge live">Exact ledger fields checked</span> <span class="small">${r.narrative.source==='gemini'?'AI-selected events':'Deterministic update'} · ${r.narrative.droppedClaims} proposals rejected</span></div><ul class="evidence-list">${r.narrative.claims.map(c=>`<li>${esc(c.text)} ${evidenceLink(c,'Inspect transaction')}</li>`).join('')}</ul>${r.audio.url?`<audio controls src="${r.audio.url}"></audio>`:`<p class="small">${esc(r.audio.reason)}</p>`}<div class="receipt-actions"><button class="btn btn-sm" id="copyUpdate">Copy update with evidence</button><button class="btn btn-sm" id="downloadEvidence">Download evidence JSON</button></div><p class="small" id="shareStatus" aria-live="polite"></p><details><summary>Read the spoken script</summary><pre>${esc(r.audio.script)}</pre></details>`;
    $('copyUpdate').onclick=async()=>{
      const text=`Openhand devnet demo · ${when(r.readAt)}\n${r.narrative.summary}\n\n${r.narrative.claims.map(c=>`${c.text}\n${c.explorer}`).join('\n\n')}\nWallet: ${r.cause.explorer}\nInspect: ${location.origin}/app\nSnapshot: ${r.snapshotId}`;
      try{await navigator.clipboard.writeText(text);$('shareStatus').textContent='Copied with timestamp and public evidence links.';}catch{$('shareStatus').textContent='Clipboard unavailable. Download the evidence instead.';}
    };
    $('downloadEvidence').onclick=()=>{const {audio,...evidence}=r;const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`openhand-${r.snapshotId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    renderStages();
  }catch(err){$('receipt').textContent=err.message;}
  $('makeReceipt').disabled=false;$('makeReceipt').textContent='Generate checked update';
};
$('checkClaim').onclick=async()=>{
  const r=state.ledger.find(r=>r.kind==='payout')||state.ledger[0];
  $('claimResult').textContent='Checking an intentionally altered amount…';
  try{
    const response=await fetch(`/api/cause/${CAUSE_ID}/check-claim`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({snapshotId:state.snapshotId,claim:{eventId:r.id,kind:r.kind,lamports:r.lamports+1e9,memo:r.memo}})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    if(result.claims?.length || !result.rejected?.length)throw new Error('The altered claim was not rejected. Inspect the validator before trusting this update.');
    $('claimResult').textContent=`Rejected: claimed ${sol(r.amountSol+1)}, ledger records ${rowAmount(r)}. ${result.rejected[0]?.reason || 'Unexpected result; inspect the ledger.'} A real signature cannot excuse a false amount.`;
  }catch(err){$('claimResult').textContent=err.message;}
};
const rpc=async(method,params)=>{const r=await fetch('/api/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({method,params})});const b=await r.json();if(b.error)throw new Error(b.error.message||b.error);return b.result;};
$('donate').onclick=async()=>{
  const note=$('donateNote'),wallet=window.phantom?.solana||window.solana;
  if(!wallet?.isPhantom){note.textContent='Phantom is not installed in this browser. You can inspect the complete demo without a wallet.';return;}
  $('donate').disabled=true;
  try{
    if(!state?.cause.demo)throw new Error('This is only enabled for the dedicated devnet demo.');
    await wallet.connect();
    const {Transaction,SystemProgram,PublicKey,LAMPORTS_PER_SOL}=window.solanaWeb3;
    const latest=(await rpc('getLatestBlockhash',[{commitment:'confirmed'}])).value;
    const tx=new Transaction({feePayer:wallet.publicKey,recentBlockhash:latest.blockhash}).add(SystemProgram.transfer({fromPubkey:wallet.publicKey,toPubkey:new PublicKey(state.cause.wallet),lamports:Math.round(.05*LAMPORTS_PER_SOL)}));
    const signed=await wallet.signTransaction(tx);
    const encoded=btoa(String.fromCharCode(...signed.serialize()));
    const signature=await rpc('sendTransaction',[encoded,{encoding:'base64',preflightCommitment:'confirmed',maxRetries:3}]);
    const link=`https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    note.innerHTML=`Submitted, awaiting finalization. <a class="sig" href="${esc(link)}" target="_blank" rel="noopener">Inspect transaction</a>`;
    let finalized=false;
    for(let i=0;i<45;i++){
      await new Promise(r=>setTimeout(r,2000));
      const status=(await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}])).value[0];
      if(status?.err)throw new Error('Transaction failed on chain. No donation was recorded.');
      if(status?.confirmationStatus==='finalized'){finalized=true;break;}
    }
    if(!finalized){note.textContent=`Still pending. Check ${link} before trying again.`;return;}
    await load(true);note.textContent=state.ledger.some(r=>r.signature===signature&&r.kind==='donation')?'Finalized. Your donation is now in the ledger.':`Finalized on devnet; the ledger read has not caught up. Refresh to check ${signature}.`;
  }catch(err){note.textContent=err.message;}finally{$('donate').disabled=false;}
};
load();
