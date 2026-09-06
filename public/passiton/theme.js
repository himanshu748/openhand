// Appearance is shared by the landing page and workspace. System is the default.
const appearance=document.getElementById('appearance');
let preferred='system';
try{preferred=localStorage.getItem('passiton-appearance')||'system';}catch{}
if(!['system','light','dark'].includes(preferred))preferred='system';
function apply(value){if(value==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=value;}
apply(preferred);
if(appearance){appearance.value=preferred;appearance.addEventListener('change',()=>{apply(appearance.value);try{localStorage.setItem('passiton-appearance',appearance.value);}catch{}});}
