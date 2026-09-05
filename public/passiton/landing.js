try {
  const response=await fetch('/api/passiton/catalog');
  if(!response.ok)throw new Error('Configuration unavailable');
  const {integrations}=await response.json();
  document.querySelectorAll('[data-provider]').forEach(node=>{
    const provider=node.dataset.provider;
    node.textContent=provider==='solana'?'Devnet · Test SOL only':integrations[provider]==='configured'?'Configured for this demo':provider==='snowflake'?'Connection pending · Local demo available':'Not configured';
  });
  if(integrations.snowflake!=='configured')document.getElementById('configurationNote').textContent='Snowflake connection is pending. The demo currently keeps activity in your browser; shared answers become available after connection.';
} catch {
  document.querySelectorAll('[data-provider]').forEach(node=>{if(node.dataset.provider!=='solana')node.textContent='Configuration unavailable';});
  document.getElementById('configurationNote').textContent='Configuration could not be checked. Open the demo for current service status.';
}
