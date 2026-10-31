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
const hashOf=()=>JSON.stringify([S.tasks,S.lists,S.spaces,S.arch||[],S.cfg,S.nid,S.focusLog||{},S.habits||[],S.hchains||[],S.goals||[],S.kpis||[],S.okrs||[],S.wins||[],S.routines||[]]);
const busyUI=()=>document.querySelector('.sheet.on,.focus.on,.tide.on');
const SYNC_LABEL={off:'Off',syncing:'Syncing…',synced:'Up to date',offline:'Offline, will sync later',error:'Couldn’t sync, will retry'};
function setSync(s){syncState=s;const el=document.getElementById('syncStatus');if(el)el.textContent=SYNC_LABEL[s];try{drawMe()}catch(e){}
  if(s==='error'&&S.dirty){clearTimeout(syncTimer);syncTimer=setTimeout(push,10000)}}
function cloudDirty(){
  if(!user||applying)return;const h=hashOf();if(h===lastHash)return;lastHash=h;
  S.dirty=true;S.editAt=Date.now();saveLocal();clearTimeout(syncTimer);syncTimer=setTimeout(push,1500);
}
/* ---- merge: combine two copies item by item, newest change wins, deletions respected ---- */
const localDoc=()=>({tasks:S.tasks,lists:S.lists,spaces:S.spaces,arch:S.arch||[],habits:S.habits||[],hchains:S.hchains||[],goals:S.goals||[],kpis:S.kpis||[],okrs:S.okrs||[],wins:S.wins||[],routines:S.routines||[],cfg:S.cfg,cfgU:S.cfgU||0,orderU:S.orderU||0,tomb:S.tomb||{},nid:S.nid,focusLog:S.focusLog||{},resetAt:S.resetAt||0});
const coreOf=d=>JSON.stringify([d.tasks,d.lists,d.spaces,d.arch||[],d.cfg,d.focusLog,d.habits||[],d.hchains||[],d.goals||[],d.kpis||[],d.okrs||[],d.wins||[],d.routines||[]]);
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
  // after a full reset, focus history from before the reset must not come back
  const lr=L.resetAt||0,rr=Rm.resetAt||0;
  const fl=lr!==rr?{...((lr>rr?L:Rm).focusLog||{})}:{...(Rm.focusLog||{})};if(lr===rr)Object.entries(L.focusLog||{}).forEach(([k,v])=>{fl[k]=Math.max(fl[k]||0,v)});
  const lc=(L.cfgU||0)>=(Rm.cfgU||0);
  return {tasks:mergeArr('t',L.tasks,Rm.tasks,(L.orderU||0)>=(Rm.orderU||0)),lists:mergeArr('l',L.lists,Rm.lists,true),spaces:mergeArr('s',L.spaces,Rm.spaces,true),arch:mergeArr('a',L.arch,Rm.arch,true),habits:mergeArr('h',L.habits,Rm.habits,true),hchains:mergeArr('c',L.hchains,Rm.hchains,true),goals:mergeArr('g',L.goals,Rm.goals,true),kpis:mergeArr('k',L.kpis,Rm.kpis,true),okrs:mergeArr('o',L.okrs,Rm.okrs,true),wins:mergeArr('w',L.wins,Rm.wins,true),routines:mergeArr('r',L.routines,Rm.routines,true),
    cfg:lc?L.cfg:(Rm.cfg||L.cfg),cfgU:Math.max(L.cfgU||0,Rm.cfgU||0),orderU:Math.max(L.orderU||0,Rm.orderU||0),tomb,nid:Math.max(L.nid||0,Rm.nid||0),focusLog:fl,resetAt:Math.max(lr,rr)};
}
function applyDoc(d){
  applying=true;
  S.tasks=d.tasks||[];S.arch=Array.isArray(d.arch)?d.arch:[];if(Array.isArray(d.habits))S.habits=d.habits;if(Array.isArray(d.hchains))S.hchains=d.hchains;if(Array.isArray(d.goals))S.goals=d.goals;if(Array.isArray(d.kpis))S.kpis=d.kpis;if(Array.isArray(d.okrs))S.okrs=d.okrs;if(Array.isArray(d.wins))S.wins=d.wins;if(Array.isArray(d.routines))S.routines=d.routines;if(d.lists&&d.lists.length)S.lists=d.lists;if(d.spaces&&d.spaces.length)S.spaces=d.spaces;
  S.cfgU=d.cfgU||0;S.orderU=d.orderU||0;S.tomb=d.tomb||{};S.nid=Math.max(S.nid||0,d.nid||0);S.focusLog=d.focusLog||{};if(d.resetAt)S.resetAt=d.resetAt;
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
const DEMO_TITLES=new Set([...SEED.map(x=>x.title),...DEMO_LIST_TITLES]);Object.freeze(SEED);
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
/* first sign-in on a device that already has its own tasks.
   Neither choice can ever wipe the account: "Keep both" adds this device's tasks to it,
   "Use only my account's tasks" leaves the account as it is and replaces this device's copy. */
function askMerge(remote){
  $('mergeTxt').textContent=`This device has ${S.tasks.length} ${S.tasks.length===1?'task':'tasks'}. Your account has ${remote.tasks.length}. Your account’s tasks are always kept.`;
  openSheet('mergeSheet');
  $('mergeBoth').onclick=()=>{closeSheets();mergeBoth(remote)};
  $('mergeCloud').onclick=()=>{closeSheets();applyRemote(remote);setSync('synced');toast('Tasks loaded from your account')};
}
function mergeBoth(remote){
  const mine=localDoc();
  mine.tasks=mine.tasks.filter(t=>!DEMO_TITLES.has(t.title)); // leave the example tasks behind
  // only bring lists and spaces this device actually uses (so example lists don't come back)
  const rl=new Set((remote.lists||[]).map(l=>l.id)),rs=new Set((remote.spaces||[]).map(x=>x.id));
  mine.lists=mine.lists.filter(l=>rl.has(l.id)||mine.tasks.some(t=>t.list===l.id));
  mine.spaces=mine.spaces.filter(x=>rs.has(x.id)||mine.lists.some(l=>l.space===x.id));
  const m=mergeDocs(mine,remote);
  m.cfg=remote.cfg||m.cfg;m.cfgU=Math.max(remote.cfgU||0,m.cfgU||0); // keep the account's settings
  applyDoc(m);S.syncedUser=user.id;S.dirty=true;saveLocal();
  push().then(()=>toast('Both kept: your account now has every task'));
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
/* desktop app: pick up a windaday://auth#... link handed over by the browser */
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
    authMsg='';haptic(12);if(p.get('type')==='recovery'){openNewPassword();return}
    authStep='email';toast('Signed in');if(settingsOpen())drawSettings()}
  catch(e){authMsg=friendly(e);if(settingsOpen())drawSettings()}
};
async function initCloud(){
  if(!CLOUD)return;
  try{await loadSB()}catch(e){return}
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==='PASSWORD_RECOVERY')setTimeout(openNewPassword,300);
    const u=session&&session.user||null,changed=(u&&u.id)!==(user&&user.id);user=u;
    if(changed)setTimeout(()=>user?onSignedIn():onSignedOut(),0);
  });
  if(DESK())window.blitzitLink();
  window.addEventListener('online',()=>user&&reconcile(false));
  window.addEventListener('offline',()=>user&&setSync('offline'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)reconcile(false)});
}
function openNewPassword(){authStep='newpass';authMsg='';pwShow=false;try{openYou('account')}catch(e){}}
let pvState='out';
function accountPage(){
  const PV=!CLOUD;
  const pvBar=PV?`<div class="pv-note"><b>Preview.</b> Sign-in works in the installed app. Tap below to see each screen.</div>
    <div class="segc pv-seg">${[['out','Signed out'],['sent','Email sent'],['in','Signed in']].map(([k,l])=>`<button data-pv="${k}" class="${pvState===k?'on':''}">${l}</button>`).join('')}</div>`:'';
  const head=accInYou?pvBar:`<div class="set-top"><button class="icon-btn" id="subBack" aria-label="Back">${BACK_SVG}</button></div><h1 class="sub-h">Account</h1>`+pvBar;
  const user=PV?(pvState==='in'?{email:'you@email.com'}:null):window.__u;
  const authStep=PV?(pvState==='sent'?'code':(window.__step==='code'?'email':window.__step)):window.__step;
  const syncState=PV?'synced':window.__ss;
  if(PV&&pvState==='sent'&&!authEmail)authEmail='you@gmail.com';
  if(!PV&&!sb)return head+`<p class="sub-p">Can’t reach the sync service right now. Check your connection and try again.</p>`;
  // opened from the "reset password" email: choose the new password first
  if(user&&authStep==='newpass')return head+`<div class="auth-h"><h2>Set a new password</h2><p>For <b>${esc(user.email||'')}</b>. You’ll use it to sign in on all your devices.</p></div>
    <div class="acc-form">${pwField('accNewPw','new-password','New password')}${pwHint()}
    <button class="primary" id="accSavePw" ${authBusy?'disabled':''}>${authBusy?'Saving…':'Save password'}</button>
    <p class="acc-msg">${esc(authMsg)}</p></div>`;
  if(user)return head+`${accInYou?'':'<p class="sub-p">Your tasks sync across every device you sign in on.</p>'}
    <div class="set-sec">${row('Signed in as',`<span class="acc-val acc-email">${esc(user.email||'')}</span>`)}
    ${row('Sync',`<span class="sync-r"><span class="acc-val" id="syncStatus">${SYNC_LABEL[syncState]}</span><button class="sync-now" id="accSync" type="button" aria-label="Sync now" title="Sync now"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg></button></span>`)}</div>
    <div class="set-sec"><h3>Password</h3>${pwOpen?`<div class="pw-box">${pwField('accNewPw','new-password','New password')}${pwHint()}
      <div class="dz-btns"><button class="ghost-btn" id="accPwCancel" type="button">Cancel</button><button class="pw-save" id="accSavePw" type="button" ${authBusy?'disabled':''}>${authBusy?'Saving…':'Save password'}</button></div>
      <p class="acc-msg">${esc(authMsg)}</p></div>`:`<button class="link-row" id="accPwOpen">Set or change password</button>`}</div>
    <div class="set-sec"><button class="link-row warn" id="accOut">Sign out</button></div>
    <div class="ver">Signing out keeps your tasks on this device.</div>`;
  if(authStep==='resetSent')return head+mailWait('Check your email',`We sent a link to set a new password to <b>${esc(authEmail)}</b>. ${DESK()?'Click it, then come back here.':'Tap it to choose your new password.'}`,'Can’t find it? Check your spam folder.');
  if(authStep==='confirm')return head+mailWait('Confirm your email',`We sent a confirmation link to <b>${esc(authEmail)}</b>. ${DESK()?'Click it and Windaday signs you in.':'Tap it and you’re in.'}`,'Didn’t get it? Check your spam folder, or resend.',true);
  if(authStep==='forgot')return head+`<div class="auth-h"><h2>Forgot your password?</h2><p>Enter your email and we’ll send you a link to set a new one.</p></div>
    <div class="acc-form">${emailField()}
    <button class="primary" id="accReset" ${authBusy?'disabled':''}>${authBusy?'Sending…':'Send reset link'}</button>
    <p class="acc-msg">${esc(authMsg)}</p>
    <p class="auth-foot"><button class="auth-link" id="accToSignin" type="button">Back to sign in</button></p></div>`;
  if(authStep==='signup')return head+`<div class="auth-h"><h2>Create your account</h2><p>Your tasks sync across your phone and computer.</p></div>
    <div class="acc-form">${emailField()}${pwField('accPw','new-password','Create a password')}${pwHint()}
    <button class="primary" id="accSignup" ${authBusy?'disabled':''}>${authBusy?'Creating…':'Create account'}</button>
    <p class="acc-msg">${esc(authMsg)}</p>
    <p class="auth-foot">Already have an account? <button class="auth-link" id="accToSignin" type="button">Sign in</button></p></div>`;
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
  // sign in: email + password first, the email link as the other way
  return head+`<div class="auth-h"><h2>Sign in</h2>${PV?'':'<p class="auth-warn"><i></i>Your tasks are only on this device.</p>'}<p>Sign in to back up and sync them.</p></div>
    <div class="acc-form">${emailField()}${pwField('accPw','current-password','Password')}
    <div class="auth-row"><button class="auth-link" id="accToForgot" type="button">Forgot password?</button></div>
    <button class="primary" id="accSignin" ${authBusy?'disabled':''}>${authBusy?'Signing in…':'Sign in'}</button>
    <p class="acc-msg">${esc(authMsg)}</p>
    <div class="auth-or"><span>or</span></div>
    <button class="secondary auth-alt" id="accSend" type="button">Email me a sign-in link</button>
    <p class="auth-foot">New to Windaday? <button class="auth-link" id="accToSignup" type="button">Create an account</button></p></div>`;
}
/* ---------- password sign-in ---------- */
let pwOpen=false,pwShow=false;
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const emailField=()=>`<input class="acc-in" id="accEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" enterkeyhint="next" placeholder="you@email.com" value="${esc(authEmail)}">`;
const pwField=(id,ac,ph)=>`<div class="pw-wrap"><input class="acc-in pw-in" id="${id}" type="${pwShow?'text':'password'}" autocomplete="${ac}" autocapitalize="off" enterkeyhint="go" placeholder="${ph}" spellcheck="false"><button class="pw-eye" id="pwEye" type="button" aria-label="${pwShow?'Hide password':'Show password'}" aria-pressed="${pwShow}">${pwShow?EYE_OFF:EYE}</button></div>`;
const pwHint=()=>`<p class="pw-hint" id="pwHint"><i></i>At least 8 characters</p>`;
const PW_MIN=8;
const validEmail=em=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em);
const backTo=()=>location.origin+location.pathname+(DESK()&&DESK_LINK?'?desk=1':'');
async function authRun(fn){authBusy=true;authMsg='';drawSettings();try{await fn()}catch(e){authMsg=friendly(e)}authBusy=false;drawSettings()}
function accSignin(){
  const em=($('accEmail').value||'').trim(),pw=$('accPw').value||'';authEmail=em;
  if(!validEmail(em)){authMsg='Please enter a valid email.';return drawSettings()}
  if(!pw){authMsg='Enter your password.';return drawSettings()}
  return authRun(async()=>{const {error}=await sb.auth.signInWithPassword({email:em,password:pw});if(error)throw error;
    authStep='email';pwShow=false;haptic(12);toast('Signed in')});
}
function accSignup(){
  const em=($('accEmail').value||'').trim(),pw=$('accPw').value||'';authEmail=em;
  if(!validEmail(em)){authMsg='Please enter a valid email.';return drawSettings()}
  if(pw.length<PW_MIN){authMsg=`Use at least ${PW_MIN} characters.`;return drawSettings()}
  return authRun(async()=>{const {data,error}=await sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:backTo()}});if(error)throw error;
    // an existing email comes back without identities: say so instead of pretending to send
    if(data&&data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length)throw new Error('already registered');
    pwShow=false;if(data&&data.session){authStep='email';haptic(12);toast('Account created')}else{authStep='confirm';resendAt=Date.now()+60000}});
}
function accReset(){
  const em=($('accEmail').value||'').trim();authEmail=em;
  if(!validEmail(em)){authMsg='Please enter a valid email.';return drawSettings()}
  return authRun(async()=>{const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:backTo()});if(error)throw error;authStep='resetSent'});
}
function accSavePw(){
  const pw=$('accNewPw').value||'';
  if(pw.length<PW_MIN){authMsg=`Use at least ${PW_MIN} characters.`;return drawSettings()}
  return authRun(async()=>{const {error}=await sb.auth.updateUser({password:pw});if(error)throw error;
    authStep='email';pwOpen=false;pwShow=false;haptic(12);toast('Password saved')});
}
function accResendConfirm(){
  if(Date.now()<resendAt){authMsg=`You can resend in ${Math.ceil((resendAt-Date.now())/1000)}s.`;return drawSettings()}
  return authRun(async()=>{const {error}=await sb.auth.resend({type:'signup',email:authEmail,options:{emailRedirectTo:backTo()}});if(error)throw error;resendAt=Date.now()+60000;toast('Email sent again')});
}
function mailWait(title,html,small,resend){
  const dom=(authEmail.split('@')[1]||'').toLowerCase();
  const inbox=dom==='gmail.com'||dom==='googlemail.com'?'https://mail.google.com/mail/u/0/#inbox':/^(outlook|hotmail|live|msn)\./.test(dom)?'https://outlook.live.com/mail/':dom==='yahoo.com'?'https://mail.yahoo.com':/^(icloud|me|mac)\.com$/.test(dom)?'https://www.icloud.com/mail':'';
  return `<div class="mail-wait">
    <div class="mail-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/></svg></div>
    <h2>${title}</h2><p>${html}</p>
    ${inbox?`<a class="primary mail-open" href="${inbox}" target="_blank" rel="noopener">Open ${dom.startsWith('gmail')||dom.startsWith('google')?'Gmail':'your inbox'}</a>`:''}
    <p class="acc-msg">${esc(authMsg)}</p>
    <div class="acc-links">${resend?'<button class="ghost-btn" id="accResendConfirm">Resend email</button>':''}<button class="ghost-btn" id="accToSignin">Back to sign in</button></div>
    <p class="mail-small">${small}</p></div>`;
}
const friendly=e=>{const m=(e&&e.message||'').toLowerCase();
  if(m.includes('invalid login')||m.includes('invalid credentials'))return 'Wrong email or password.';
  if(m.includes('already registered')||m.includes('already been registered')||m.includes('already exists'))return 'This email already has an account. Sign in instead.';
  if(m.includes('not confirmed'))return 'Please confirm your email first. Check your inbox for the link.';
  if(m.includes('different from the old')||m.includes('same password'))return 'That’s your current password. Choose a new one.';
  if(m.includes('password')&&(m.includes('least')||m.includes('short')||m.includes('weak')))return `Use at least ${PW_MIN} characters.`;
  if(m.includes('rate')||m.includes('too many')||m.includes('seconds'))return 'Too many attempts. Please wait a minute and try again.';
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
  const p=new URLSearchParams(HANDOFF),err=p.get('error'),link='windaday://auth#'+HANDOFF,old='blitzit://auth#'+HANDOFF;
  const d=document.createElement('div');d.className='handoff';
  d.innerHTML=err?`<div class="ho-in"><div class="brand">Windaday<i></i></div>
      <h1>Link expired</h1><p>${p.get('error_code')==='otp_expired'?'This sign-in link is too old or was already used.':'This sign-in link didn’t work.'} Go back to the Windaday app and send a new one.</p></div>`
    :`<div class="ho-in"><div class="brand">Windaday<i></i></div>
      <h1>Opening Windaday…</h1><p>If your browser asks, choose <b>Open</b>. You’ll be signed in, and you can close this tab.</p>
      <a class="primary ho-go" href="${link}">Open Windaday</a>
      <a class="ghost-btn ho-old" href="${old}">Nothing happened? Open an older Windaday app</a>
      <button class="ghost-btn" id="hoHere">Not on your computer? Sign in here instead</button></div>`;
  document.body.appendChild(d);document.body.classList.add('ho-on');
  if(!err){setTimeout(()=>{location.href=link},350);
    $('hoHere').onclick=()=>{location.replace(location.pathname+'#'+HANDOFF);location.reload()}}
}

