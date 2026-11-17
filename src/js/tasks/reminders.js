/* ---------- Reminders: a routine at its time, the journal's evening line ----------
   While Windaday is open (or in the tray on computers), a calm card slides in at the right time with one button
   (Start / Write) and Later (10 minutes). If the browser allows notifications, a system notification shows too
   when Windaday is in the background. Each reminder fires once a day per device (kept in localStorage, not synced).
   Phones only get them while the app is open: reminders with the app closed would need a push server. */
const REM_KEY='wd-rem';
let remFired=(()=>{try{return JSON.parse(localStorage.getItem(REM_KEY))||{}}catch(e){return {}}})(),remSnooze={};
const remSave=()=>{try{const k=today();Object.keys(remFired).forEach(x=>{if(!x.endsWith('@'+k))delete remFired[x]});localStorage.setItem(REM_KEY,JSON.stringify(remFired))}catch(e){}};
const remMin=hm=>{const [h,m]=String(hm).split(':').map(Number);return h*60+m};
/* ask once for system notifications, when you turn a reminder on */
function remAsk(){try{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}catch(e){}}
function remList(){const out=[];
  if(typeof routinesOn==='function'&&routinesOn())rtAll().forEach(r=>{if(r.rem&&r.at&&rtDue(r)&&!rtDone(r)&&r.steps.length)
    out.push({id:'rt'+r.id,at:r.at,t:`${r.e?r.e+' ':''}${r.name}`,sub:`Time for your routine · ${r.steps.length} ${r.steps.length===1?'step':'steps'} · ${fmt(rtMins(r))}`,go:'Start',ic:RT_ICON,act:()=>rtPlayOpen(r.id)})});
  if(typeof journalOn==='function'&&journalOn()&&C().jRem){const j=jrGet(today());if(!j||!j.pm.trim())
    out.push({id:'jr',at:C().jRemAt||'21:00',t:'Journal',sub:'One line before bed: what went well today?',go:'Write',ic:JR_ICON,act:()=>{if(matchMedia('(min-width:1100px)').matches)openJournal();else tbGo('journal');
      setTimeout(()=>{const ta=document.querySelector('#journalPg [data-jrf="pm"]');if(ta){ta.focus();ta.scrollIntoView({block:'center'})}},350)}})}
  return out}
function remTick(){if(!S||!S.cfg)return;const now=pnNowMin(),k=today();
  remList().forEach(r=>{const key=r.id+'@'+k,at=remSnooze[r.id]||remMin(r.at);if(remFired[key]&&!remSnooze[r.id])return;if(now<at||now-at>60)return;
    remFired[key]=1;delete remSnooze[r.id];remSave();remShow(r)})}
document.body.insertAdjacentHTML('beforeend','<div class="rem-card" id="remCard" role="alertdialog" aria-live="polite" aria-label="Reminder"></div>');
let remCur=null;
function remShow(r){remCur=r;
  $('remCard').innerHTML=`<span class="rem-ic">${r.ic}</span><span class="rem-t"><b>${esc(r.t)}</b><small>${esc(r.sub)}</small></span>
    <span class="rem-acts"><button class="rem-later" data-remlater>Later</button><button class="rem-go" data-remgo>${r.go}</button></span>`;
  $('remCard').classList.add('on');try{sfx('start')}catch(e){}haptic([8,40,8]);
  try{if('Notification' in window&&Notification.permission==='granted'&&document.hidden){const n=new Notification(r.t,{body:r.sub,tag:r.id});n.onclick=()=>{try{window.focus()}catch(e){}n.close();remGo()}}}catch(e){}}
function remHide(){$('remCard').classList.remove('on');remCur=null}
function remGo(){const r=remCur;remHide();if(r)r.act()}
$('remCard').addEventListener('click',e=>{if(e.target.closest('[data-remgo]'))return remGo();
  if(e.target.closest('[data-remlater]')){const r=remCur;remHide();if(r){remSnooze[r.id]=pnNowMin()+10;toast('We’ll remind you in 10 minutes')}}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&remCur){e.preventDefault();e.stopImmediatePropagation();remHide()}},true);
setInterval(remTick,30000);setTimeout(remTick,3000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)remTick()});
/* turning the journal reminder on asks for notifications too */
const _remSet=setCfg;setCfg=function(k,v){_remSet.apply(this,arguments);if(k==='jRem'&&v)remAsk()};
