/* ---------- sidebar collapse ---------- */
function applySide(){const c=!!S.sideCollapsed;$('desk').classList.toggle('collapsed',c);
  $('sToggle').setAttribute('aria-label',c?'Expand sidebar':'Collapse sidebar');$('sToggle').title=(c?'Expand':'Collapse')+' sidebar  [ '}
function toggleSide(){S.sideCollapsed=!S.sideCollapsed;applySide();save()}
$('sToggle').onclick=toggleSide;
applySide();

/* ---------- cloud: sign-in + sync ---------- */
Object.defineProperty(window,'__u',{get:()=>user});Object.defineProperty(window,'__step',{get:()=>authStep});Object.defineProperty(window,'__ss',{get:()=>syncState});
const CLOUD=/^https?:$/.test(location.protocol)&&!/claude\.ai|claudeusercontent|anthropic/.test(location.hostname);
const SB_URL='https://lhmlfbnnixkhuxtsqagv.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobWxmYm5uaXhraHV4dHNxYWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODMyNjQsImV4cCI6MjEwNjg1OTI2NH0.7Kplx5ud2ES_lxMOwIm5D0SVYXlCtW3hqIr-dCmkQic';
const CID=Math.random().toString(36).slice(2);
let sb=null,user=null,syncState='off',syncTimer=null,pendingRemote=null,channel=null,applying=false,lastHash='';
let authStep='email',authEmail='',authBusy=false,authMsg='',resendAt=0;
const saveLocal=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const hashOf=()=>JSON.stringify([S.tasks,S.lists,S.spaces,S.cfg,S.nid,S.focusLog||{}]);
const busyUI=()=>document.querySelector('.sheet.on,.focus.on,.tide.on');
const SYNC_LABEL={off:'Off',syncing:'Syncing…',synced:'Up to date',offline:'Offline, will sync later',error:'Couldn’t sync, will retry'};
function setSync(s){syncState=s;const el=document.getElementById('syncStatus');if(el)el.textContent=SYNC_LABEL[s];try{drawMe()}catch(e){}
  if(s==='error'&&S.dirty){clearTimeout(syncTimer);syncTimer=setTimeout(push,10000)}}
function cloudDirty(){
  if(!user||applying)return;const h=hashOf();if(h===lastHash)return;lastHash=h;
  S.dirty=true;S.editAt=Date.now();saveLocal();clearTimeout(syncTimer);syncTimer=setTimeout(push,1500);
}
/* ---- merge: combine two copies item by item, newest change wins, deletions respected ---- */
const localDoc=()=>({tasks:S.tasks,lists:S.lists,spaces:S.spaces,cfg:S.cfg,cfgU:S.cfgU||0,orderU:S.orderU||0,tomb:S.tomb||{},nid:S.nid,focusLog:S.focusLog||{}});
const coreOf=d=>JSON.stringify([d.tasks,d.lists,d.spaces,d.cfg,d.focusLog]);
function mergeDocs(L,Rm){
  const tomb={...(Rm.tomb||{})};Object.entries(L.tomb||{}).forEach(([k,v])=>{if(!tomb[k]||tomb[k]<v)tomb[k]=v});
  const cut=Date.now()-60*DAY;Object.keys(tomb).forEach(k=>{if(tomb[k]<cut)delete tomb[k]});
  const mergeArr=(k,a,b,localOrder)=>{
    a=a||[];b=b||[];const map=new Map();
    b.forEach(x=>map.set(x.id,x));
    a.forEach(x=>{const c=map.get(x.id);if(!c||(x.u||0)>=(c.u||0))map.set(x.id,x)});
    const base=localOrder?a:b,other=localOrder?b:a,seen=new Set(),ids=[];
    base.concat(other).forEach(x=>{if(!seen.has(x.id)){seen.add(x.id);ids.push(x.id)}});
    return ids.map(id=>map.get(id)).filter(x=>{const t=tomb[k+':'+x.id];return !(t&&t>=(x.u||0))});
  };
  const fl={...(Rm.focusLog||{})};Object.entries(L.focusLog||{}).forEach(([k,v])=>{fl[k]=Math.max(fl[k]||0,v)});
  const lc=(L.cfgU||0)>=(Rm.cfgU||0);
  return {tasks:mergeArr('t',L.tasks,Rm.tasks,(L.orderU||0)>=(Rm.orderU||0)),lists:mergeArr('l',L.lists,Rm.lists,true),spaces:mergeArr('s',L.spaces,Rm.spaces,true),
    cfg:lc?L.cfg:(Rm.cfg||L.cfg),cfgU:Math.max(L.cfgU||0,Rm.cfgU||0),orderU:Math.max(L.orderU||0,Rm.orderU||0),tomb,nid:Math.max(L.nid||0,Rm.nid||0),focusLog:fl};
}
function applyDoc(d){
  applying=true;
  S.tasks=d.tasks||[];if(d.lists&&d.lists.length)S.lists=d.lists;if(d.spaces&&d.spaces.length)S.spaces=d.spaces;
  S.cfgU=d.cfgU||0;S.orderU=d.orderU||0;S.tomb=d.tomb||{};S.nid=Math.max(S.nid||0,d.nid||0);S.focusLog=d.focusLog||{};
  if(d.cfg)S.cfg=Object.assign({},DEF_CFG,d.cfg,{names:Object.assign({},DEF_CFG.names,d.cfg.names),colors:Object.assign({},DEF_CFG.colors,d.cfg.colors)});
  migrateSpaces();
  S.tasks.forEach(t=>{t.subs=t.subs||[];t.notes=t.notes||'';t.repeat=t.repeat||'none'});
  if(S.list!=='all'&&!S.lists.find(l=>l.id===S.list))S.list='all';
  trackMap=null;applySettings();render();trackChanges();lastHash=hashOf();saveLocal();applying=false;
}
async function push(){
  if(!sb||!user)return;if(!navigator.onLine)return setSync('offline');
  setSync('syncing');
  try{
    const remote=await pullRemote();
    let doc=localDoc();
    if(remote&&Array.isArray(remote.tasks)&&S.syncedUser===user.id){const m=mergeDocs(doc,remote);if(coreOf(m)!==coreOf(doc)&&!busyUI())applyDoc(m);doc=m}
    const out={...doc,_cid:CID,_v:Date.now()};
    const {error}=await sb.from('user_data').upsert({user_id:user.id,data:out,updated_at:new Date().toISOString()});
    if(error)throw error;
    S.syncV=out._v;S.dirty=false;S.syncedUser=user.id;lastHash=hashOf();saveLocal();setSync('synced');
  }catch(e){setSync(navigator.onLine?'error':'offline')}
}
/* replace everything (only used when you choose "use my account's tasks") */
function applyRemote(d){applyDoc({...d,tomb:d.tomb||{}});S.syncV=d._v||0;S.dirty=false;S.syncedUser=user.id;saveLocal()}
/* merge an incoming copy into this device */
function mergeIn(d){
  if(busyUI()){pendingRemote=d;return}
  const m=mergeDocs(localDoc(),d);
  if(coreOf(m)!==coreOf(localDoc()))applyDoc(m);
  S.syncV=Math.max(S.syncV||0,d._v||0);S.syncedUser=user.id;saveLocal();
  if(coreOf(m)!==coreOf(d)){S.dirty=true;clearTimeout(syncTimer);syncTimer=setTimeout(push,800)}else setSync('synced');
}
setInterval(()=>{if(pendingRemote&&!busyUI()){const d=pendingRemote;pendingRemote=null;mergeIn(d);toast('Synced from another device')}},1500);
async function pullRemote(){
  const {data,error}=await sb.from('user_data').select('data').eq('user_id',user.id).maybeSingle();
  if(error)throw error;return data&&data.data;
}
const DEMO_TITLES=new Set(SEED.map(x=>x.title));Object.freeze(SEED);
const isDemo=()=>S.tasks.every(t=>DEMO_TITLES.has(t.title));
async function reconcile(first){
  if(!sb||!user)return;if(!navigator.onLine)return setSync('offline');
  setSync('syncing');
  let remote;try{remote=await pullRemote()}catch(e){return setSync('error')}
  if(!remote||!Array.isArray(remote.tasks))return push();
  if(S.syncedUser===user.id){mergeIn(remote);return}
  if(!S.tasks.length||isDemo()){applyRemote(remote);return setSync('synced')}
  if(first)askMerge(remote);
}
function askMerge(remote){
  $('mergeTxt').textContent=`This device has ${S.tasks.length} ${S.tasks.length===1?'task':'tasks'}. Your account has ${remote.tasks.length}. Which do you want to keep?`;
  openSheet('mergeSheet');
  $('mergeCloud').onclick=()=>{closeSheets();applyRemote(remote);setSync('synced');toast('Tasks loaded from your account')};
  $('mergeLocal').onclick=()=>{closeSheets();push().then(()=>toast('This device’s tasks saved to your account'))};
}
function subscribe(){
  try{
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('ud-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'user_data',filter:'user_id=eq.'+user.id},p=>{
      const d=p.new&&p.new.data;if(!d||d._cid===CID||!Array.isArray(d.tasks))return;
      const before=coreOf(localDoc());mergeIn(d);if(coreOf(localDoc())!==before)toast('Synced from another device');
    }).subscribe();
  }catch(e){}
}
function onSignedIn(){reconcile(true).then(subscribe);drawMe();if(settingsOpen()&&(setView==='account'||setView==='you'))drawSettings()}
function onSignedOut(){try{channel&&sb.removeChannel(channel)}catch(e){}channel=null;setSync('off');if(settingsOpen())drawSettings()}
function loadSB(){return new Promise((res,rej)=>{if(window.supabase)return res();const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
/* desktop app: pick up a blitzit://auth#... link handed over by the browser */
let DESK_LINK=false;
function linkParams(u){const i=u.indexOf('#');return new URLSearchParams(i<0?u.split('?')[1]||'':u.slice(i+1))}
window.blitzitLink=async function(){
  if(!DESK())return;let u=null;
  try{u=await window.__TAURI__.core.invoke('take_link');DESK_LINK=true}catch(e){return}
  if(!u)return;
  const p=linkParams(u);
  if(p.get('error')){authMsg=p.get('error_code')==='otp_expired'?'That link has expired. Send a new one.':'That link didn’t work. Send a new one.';authStep='email';if(settingsOpen())drawSettings();return toast('Sign-in link expired')}
  const at=p.get('access_token'),rt=p.get('refresh_token');if(!at||!rt)return;
  for(let i=0;i<40&&!sb;i++)await new Promise(r=>setTimeout(r,250));
  if(!sb)return toast('Couldn’t reach the sync service');
  try{const {error}=await sb.auth.setSession({access_token:at,refresh_token:rt});if(error)throw error;
    authStep='email';authMsg='';haptic(12);toast('Signed in');if(settingsOpen())drawSettings()}
  catch(e){authMsg=friendly(e);if(settingsOpen())drawSettings()}
};
async function initCloud(){
  if(!CLOUD)return;
  try{await loadSB()}catch(e){return}
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,session)=>{
    const u=session&&session.user||null,changed=(u&&u.id)!==(user&&user.id);user=u;
    if(changed)setTimeout(()=>user?onSignedIn():onSignedOut(),0);
  });
  if(DESK())window.blitzitLink();
  window.addEventListener('online',()=>user&&reconcile(false));
  window.addEventListener('offline',()=>user&&setSync('offline'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)reconcile(false)});
}
let pvState='out';
function accountPage(){
  const PV=!CLOUD;
  const pvBar=PV?`<div class="pv-note"><b>Preview.</b> Sign-in works in the installed app. Tap below to see each screen.</div>
    <div class="segc pv-seg">${[['out','Signed out'],['sent','Email sent'],['in','Signed in']].map(([k,l])=>`<button data-pv="${k}" class="${pvState===k?'on':''}">${l}</button>`).join('')}</div>`:'';
  const head=accInYou?pvBar:`<div class="set-top"><button class="icon-btn" id="subBack" aria-label="Back">${BACK_SVG}</button></div><h1 class="sub-h">Account</h1>`+pvBar;
  const user=PV?(pvState==='in'?{email:'you@email.com'}:null):window.__u;
  const authStep=PV?(pvState==='sent'?'code':'email'):window.__step;
  const syncState=PV?'synced':window.__ss;
  if(PV&&pvState==='sent'&&!authEmail)authEmail='you@gmail.com';
  if(!PV&&!sb)return head+`<p class="sub-p">Can’t reach the sync service right now. Check your connection and try again.</p>`;
  if(user)return head+`<p class="sub-p">Your tasks sync across every device you sign in on.</p>
    <div class="set-sec">${row('Signed in as',`<span class="acc-val">${esc(user.email||'')}</span>`)}
    ${row('Sync',`<span class="acc-val" id="syncStatus">${SYNC_LABEL[syncState]}</span>`)}</div>
    <div class="set-sec"><button class="link-row" id="accSync">Sync now</button><button class="link-row warn" id="accOut">Sign out</button></div>
    <div class="ver">Signing out keeps your tasks on this device.</div>`;
  if(authStep==='code'){
    const dom=(authEmail.split('@')[1]||'').toLowerCase();
    const inbox=dom==='gmail.com'||dom==='googlemail.com'?'https://mail.google.com/mail/u/0/#inbox':/^(outlook|hotmail|live|msn)\./.test(dom)?'https://outlook.live.com/mail/':dom==='yahoo.com'?'https://mail.yahoo.com':/^(icloud|me|mac)\.com$/.test(dom)?'https://www.icloud.com/mail':'';
    return head+`<div class="mail-wait">
      <div class="mail-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/></svg></div>
      <h2>Check your email</h2>
      <p>We sent a sign-in link to <b>${esc(authEmail)}</b>. ${DESK()&&DESK_LINK?'Click it and Windaday signs you in.':'Tap it and you’re in.'}</p>
      <p class="mail-small">${DESK()&&DESK_LINK?'If your browser asks, choose <b>Open</b>.':'This screen updates by itself once you’re signed in.'}</p>
      ${inbox?`<a class="primary mail-open" href="${inbox}" target="_blank" rel="noopener">Open ${dom.startsWith('gmail')||dom.startsWith('google')?'Gmail':'your inbox'}</a>`:''}
      ${DESK()?`        <details class="acc-paste" ${DESK_LINK?'':'open'}><summary>${DESK_LINK?'Didn’t work? Paste the link instead':'Paste the sign-in link'}</summary><div class="acc-form">
        <p class="mail-small">Right-click the button in the email, choose <b>Copy link</b>, and paste it here.</p>
        <input class="acc-in" id="accLink" placeholder="Paste the sign-in link" autocomplete="off" spellcheck="false">
        <button class="primary" id="accLinkGo">Sign in</button></div></details>`:''}
      <p class="acc-msg">${esc(authMsg)}</p>
      <div class="acc-links"><button class="ghost-btn" id="accResend">Resend email</button><button class="ghost-btn" id="accBack">Use a different email</button></div>
      <p class="mail-small">Can’t find it? Check your spam folder.</p></div>`;
  }
  return head+`<p class="sub-p">Sign in to sync your tasks across your phone and computer. No password needed.</p>
    <div class="acc-form"><input class="acc-in" id="accEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" value="${esc(authEmail)}">
    <button class="primary" id="accSend" ${authBusy?'disabled':''}>${authBusy?'Sending…':'Email me a sign-in link'}</button>
    <p class="acc-msg">${esc(authMsg)}</p></div>`;
}
const friendly=e=>{const m=(e&&e.message||'').toLowerCase();
  if(m.includes('rate')||m.includes('too many')||m.includes('seconds'))return 'Too many emails. Please wait a minute and try again.';
  if(m.includes('expired')||m.includes('invalid'))return 'That code didn’t work. Check it, or resend the email.';
  if(m.includes('fetch')||m.includes('network'))return 'No connection. Try again when you’re online.';
  return 'Something went wrong. Please try again.'};
async function accSend(){
  const em=($('accEmail').value||'').trim();authEmail=em;
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){authMsg='Please enter a valid email.';return drawSettings()}
  authBusy=true;authMsg='';drawSettings();
  try{const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+location.pathname+(DESK()&&DESK_LINK?'?desk=1':'')}});if(error)throw error;
    authStep='code';resendAt=Date.now()+60000;authMsg=''}catch(e){authMsg=friendly(e)}
  authBusy=false;drawSettings();
}
async function accVerify(){
  const code=($('accCode').value||'').replace(/\D/g,'');
  if(code.length<6){authMsg='Enter the 6-digit code from the email.';return drawSettings()}
  authBusy=true;authMsg='';drawSettings();
  try{const {error}=await sb.auth.verifyOtp({email:authEmail,token:code,type:'email'});if(error)throw error;
    authStep='email';authMsg='';haptic(12);toast('Signed in')}catch(e){authMsg=friendly(e)}
  authBusy=false;drawSettings();
}

/* ---------- browser tab that hands the sign-in to the desktop app ---------- */
function showHandoff(){
  const p=new URLSearchParams(HANDOFF),err=p.get('error'),link='blitzit://auth#'+HANDOFF;
  const d=document.createElement('div');d.className='handoff';
  d.innerHTML=err?`<div class="ho-in"><div class="brand">Windaday<i></i></div>
      <h1>Link expired</h1><p>${p.get('error_code')==='otp_expired'?'This sign-in link is too old or was already used.':'This sign-in link didn’t work.'} Go back to the Windaday app and send a new one.</p></div>`
    :`<div class="ho-in"><div class="brand">Windaday<i></i></div>
      <h1>Opening Windaday…</h1><p>If your browser asks, choose <b>Open</b>. You’ll be signed in, and you can close this tab.</p>
      <a class="primary ho-go" href="${link}">Open Windaday</a>
      <button class="ghost-btn" id="hoHere">Not on your computer? Sign in here instead</button></div>`;
  document.body.appendChild(d);document.body.classList.add('ho-on');
  if(!err){setTimeout(()=>{location.href=link},350);
    $('hoHere').onclick=()=>{location.replace(location.pathname+'#'+HANDOFF);location.reload()}}
}

