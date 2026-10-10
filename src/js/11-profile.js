/* ---------- you: profile, stats and account ---------- */
const AVATARS=['🙂','😎','🦊','🐼','🐯','🦁','🐙','🦄','🐸','🐨','🌞','⚡','🔥','🌿','🎧','🚀','🎯','💎'];
const PERSON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4"/></svg>';
let youTab='profile',accInYou=false;
function meName(){return String((S.cfg&&S.cfg.name)||'').trim()}
function greeting(){const h=new Date().getHours();return `${h<5?'Good night':h<12?'Good morning':h<18?'Good afternoon':'Good evening'}, ${meName().split(/\s+/)[0]}`}
function initials(){return meName().split(/\s+/).filter(Boolean).map(w=>[...w][0]).slice(0,2).join('').toUpperCase()}
const focusToday=()=>Math.round(((S.focusLog||{})[today()]||0)/60);
const goalMin=()=>+(S.cfg&&S.cfg.goalMin)||0;
const goalPct=()=>goalMin()?Math.min(100,Math.round(focusToday()/goalMin()*100)):0;
function avatarHTML(cls){
  const a=S.cfg&&S.cfg.avatar,img=S.cfg&&S.cfg.avatarImg,ini=initials();
  const face=img&&/^data:image\//.test(img)?`<img src="${img}" alt="">`:a?`<em>${esc(a)}</em>`:ini?`<b>${esc(ini)}</b>`:PERSON;
  return `<span class="av ${cls||''} ${goalMin()?'has-goal':''}" style="--p:${goalPct()}"><span class="av-in">${face}</span></span>`;
}
/* sync state for the dot: ok (synced), busy (syncing), warn (not signed in / problem), none (preview) */
function meState(){
  if(!CLOUD)return 'none';const u=window.__u,ss=window.__ss;
  if(!u)return 'warn';return ss==='synced'||ss==='off'?'ok':ss==='syncing'?'busy':'warn';
}
function meSub(){
  const st=meState();
  if(goalMin())return `${fmt(focusToday())} of ${fmt(goalMin())} focused`;
  return st==='warn'?(window.__u?'Sync paused':'Sign in to sync'):st==='ok'?'Synced':st==='busy'?'Syncing…':'Profile & stats';
}
function drawMe(){
  const st=meState(),dot=st==='none'?'':`<i class="me-dot ${st}"></i>`;
  const d=$('dMe');if(d)d.innerHTML=`<span class="me-a">${avatarHTML()}${dot}</span><span class="s-name me-t"><b>${esc(meName()||'You')}</b><small>${esc(meSub())}</small></span>`;
  const m=$('setBtn');if(m)m.innerHTML=`<span class="me-a">${avatarHTML('sm')}${dot}</span>`;
}
function openYou(tab){
  youTab=tab||'profile';setView='you';lastView='you';drawSettings();
  $('settings').classList.add('on');$('scrim').classList.add('on');$('settings').scrollTop=0;haptic(5);
}
function youHead(){
  const tabs=[['profile','Profile'],['stats','Stats'],['account','Account']];
  return `<div class="set-top"><button class="icon-btn" id="setBack" aria-label="Close">${BACK_SVG}</button><button class="you-set" id="youSet">Settings${CHEV}</button></div>
  <div class="you-head">${avatarHTML('xl')}<div class="you-hl"><h1 class="you-name" id="youTitle">${esc(meName()||'You')}</h1><p>${goalMin()?`${fmt(focusToday())} of ${fmt(goalMin())} focused today`:`${streak()} day streak · ${S.tasks.filter(t=>t.doneAt&&dkey(t.doneAt)===today()).length} done today`}</p></div></div>
  <div class="segc you-tabs" role="tablist">${tabs.map(([k,l])=>`<button data-yt="${k}" class="${youTab===k?'on':''}" role="tab" aria-selected="${youTab===k}">${l}</button>`).join('')}</div>`;
}
function youProfile(){
  const c=C(),g=goalMin();
  return `<div class="set-sec"><h3>Name</h3><input class="acc-in you-in" id="youName" maxlength="40" autocomplete="name" placeholder="Your name" value="${esc(c.name||'')}"></div>
  <div class="set-sec"><h3>Avatar</h3><div class="av-grid">
    <label class="av-up ${c.avatarImg?'on':''}" title="${c.avatarImg?'Change photo':'Upload a photo'}">${c.avatarImg?`<img src="${c.avatarImg}" alt="">`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`}<input type="file" id="avFile" accept="image/*" hidden></label>
    <button data-av="" class="${!c.avatar&&!c.avatarImg?'on':''}" aria-label="Initials">${initials()?`<b>${esc(initials())}</b>`:PERSON}</button>
    ${AVATARS.map(a=>`<button data-av="${a}" class="${!c.avatarImg&&c.avatar===a?'on':''}">${a}</button>`).join('')}</div>
    ${c.avatarImg?`<button class="ghost-btn" id="avRemove">Remove photo</button>`:''}</div>
  <div class="set-sec"><h3>Daily focus goal</h3>
    ${row('Goal',`<div class="segc">${[[0,'Off'],[60,'1h'],[120,'2h'],[180,'3h'],[240,'4h']].map(([v,l])=>`<button data-goal="${v}" class="${g===v?'on':''}">${l}</button>`).join('')}</div>`,'A ring around your avatar fills as you focus')}
    ${g?`<div class="you-goal"><div class="you-bar"><span style="width:${goalPct()}%"></span></div><span>${goalPct()>=100?'Goal reached today':`${fmt(Math.max(0,g-focusToday()))} to go today`}</span></div>${goalWeek()}`:''}
  </div>`;
}
/* last 7 days against the goal: full dot = goal met, faint = some focus */
function goalWeek(){
  const g=goalMin();if(!g)return '';const log=S.focusLog||{};
  const days=[...Array(7)].map((_,i)=>{const k=dkey(Date.now()-(6-i)*DAY);return {k,m:Math.round((log[k]||0)/60)}});
  const hit=days.filter(d=>d.m>=g).length;
  return `<div class="you-week">${days.map(d=>`<span class="${d.m>=g?'hit':d.m?'some':''} ${d.k===today()?'now':''}" title="${fmt(d.m)}"><i></i><em>${new Date(d.k+'T12:00').toLocaleDateString(undefined,{weekday:'narrow'})}</em></span>`).join('')}<b>${hit} of 7 days</b></div>`;
}
/* photo avatar: cropped to a square and shrunk, so it stays small enough to sync */
function setAvatarPhoto(file){
  if(!file||!/^image\//.test(file.type))return toast('Choose an image file');
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const z=192,c=document.createElement('canvas');c.width=c.height=z;const x=c.getContext('2d');
    const s=Math.min(im.width,im.height);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,z,z);
    S.cfg.avatarImg=c.toDataURL('image/jpeg',.85);save();drawMe();drawSettings();haptic(8);toast('Photo updated')};
    im.onerror=()=>toast('Couldn’t read that image');im.src=r.result};r.readAsDataURL(file);
}
function youBody(){
  const el=$('setIn');
  if(youTab==='stats'){
    drawStats();const seg=el.querySelector('#anRange');const top=el.querySelector('.set-top');if(top)top.remove();const h=el.querySelector('h1');if(h)h.remove();
    el.insertAdjacentHTML('afterbegin',youHead()+'<div class="you-range"></div>');if(seg)el.querySelector('.you-range').appendChild(seg);return;
  }
  if(youTab==='account'){accInYou=true;try{el.innerHTML=youHead()+accountPage()}finally{accInYou=false}return}
  el.innerHTML=youHead()+youProfile();
}
function setCfg(k,v){S.cfg[k]=v;applySettings();save();render();if(k==='cleanup'||k==='cleanupAfter')runCleanup(true);drawSettings()}

$('setIn').addEventListener('click',e=>{
  const c=C();
  if(e.target.closest('#setBack'))return closeSettings();
  const yt=e.target.closest('[data-yt]');if(yt){youTab=yt.dataset.yt;haptic(5);return drawSettings()}
  if(e.target.closest('#youSet')){setView='main';haptic(5);drawSettings();$('settings').scrollTop=0;return}
  if(e.target.closest('#youOpen')){youTab='profile';setView='you';haptic(5);drawSettings();$('settings').scrollTop=0;return}
  if(e.target.closest('#avRemove')){delete S.cfg.avatarImg;haptic(6);save();drawMe();return drawSettings()}
  const av=e.target.closest('[data-av]');if(av){delete S.cfg.avatarImg;S.cfg.avatar=av.dataset.av;haptic(6);save();drawMe();return drawSettings()}
  const gl=e.target.closest('[data-goal]');if(gl){S.cfg.goalMin=+gl.dataset.goal;haptic(5);save();render();return drawSettings()}
  const pg=e.target.closest('[data-page]');
  if(pg){const id=pg.dataset.page;haptic(5);
    if(id==='lists'){editing=true;nl=null;drawLists();openSheet('listSheet');onSheetClose=drawSettings;return}
    setView=id;drawSettings();$('settings').scrollTop=0;return}
  if(!CLOUD){
    const pv=e.target.closest('[data-pv]');if(pv){pvState=pv.dataset.pv;authMsg='';haptic(5);return drawSettings()}
    if(e.target.closest('#accSend')){const em=($('accEmail').value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){authMsg='Please enter a valid email.';return drawSettings()}
      authEmail=em;authMsg='';pvState='sent';return drawSettings()}
    if(e.target.closest('#accBack')){pvState='out';return drawSettings()}
    if(e.target.closest('#accResend'))return toast('Preview: email would be resent');
    if(e.target.closest('#accSync'))return toast('Preview: sync runs in the installed app');
    if(e.target.closest('#accOut')){pvState='out';toast('Preview: signed out');return drawSettings()}
    if(e.target.closest('.mail-open')){e.preventDefault();return toast('Preview: opens your inbox')}
  }
  if(e.target.closest('#accSend'))return accSend();
  if(e.target.closest('#accVerify'))return accVerify();
  if(e.target.closest('#accLinkGo')){const v=($('accLink').value||'').trim();
    if(!/^https:\/\/[^\s]+(supabase\.co\/auth\/v1\/verify|access_token=|token_hash=|code=)/.test(v)){authMsg='That doesn’t look like the sign-in link from the email.';return drawSettings()}
    location.href=v;return}
  if(e.target.closest('#accBack')){authStep='email';authMsg='';return drawSettings()}
  if(e.target.closest('#accResend')){if(Date.now()<resendAt){authMsg=`You can resend in ${Math.ceil((resendAt-Date.now())/1000)}s.`;return drawSettings()}authStep='email';drawSettings();return accSend()}
  if(e.target.closest('#accSync')){reconcile(false);return}
  if(e.target.closest('#accOut')){sb.auth.signOut().catch(()=>{});user=null;onSignedOut();toast('Signed out');return}
  const ar=e.target.closest('.arc-row');
  if(ar){const t=S.tasks.find(x=>x.id===+ar.dataset.id);
    if(t&&e.target.closest('[data-restore]')){commit(()=>{t.archived=false;delete t.archivedAt;t.keepUntil=Date.now()},'Restored to '+STAGES[3].name);return drawSettings()}
    if(t&&e.target.closest('[data-adel]')){commit(()=>S.tasks=S.tasks.filter(x=>x!==t),'Deleted');return drawSettings()}}
  const ae=e.target.closest('#arcEmpty');
  if(ae){if(!ae.dataset.arm){ae.dataset.arm=1;ae.textContent='Tap again to delete all archived tasks';haptic(10);setTimeout(()=>{if(ae.isConnected){delete ae.dataset.arm;ae.textContent='Empty archive'}},3000);return}
    commit(()=>S.tasks=S.tasks.filter(x=>!x.archived),'Archive emptied');return drawSettings()}
  if(e.target.closest('#replayIntro')){closeSettings();return setTimeout(()=>openIntro(true),300)}
  if(e.target.closest('#subBack')&&setView==='archive'){setView='tasks';haptic(5);drawSettings();return}
  if(e.target.closest('#subBack')){setView='main';openSw=null;haptic(5);drawSettings();$('settings').scrollTop=0;return}
  if(e.target.closest('#anBack')){setView='main';haptic(5);drawSettings();$('settings').scrollTop=0;return}
  const rg=e.target.closest('#anRange [data-r]');if(rg){anRange=+rg.dataset.r;haptic(5);return drawSettings()}
  const b=e.target.closest('[data-k]');
  if(b){let v=b.dataset.v;if(['defEst','pomoWork','pomoBreak','weekStart','cleanupAfter'].includes(b.dataset.k))v=+v;haptic(5);return setCfg(b.dataset.k,v)}
  const t=e.target.closest('[data-tg]');
  if(t){const k=t.dataset.tg;t.setAttribute('aria-pressed',!c[k]);haptic(6);setTimeout(()=>setCfg(k,!c[k]),180);return}
  const dl=e.target.closest('[data-deflist]');if(dl)return setCfg('defList',dl.dataset.deflist||null);
  const sw=e.target.closest('[data-sw]');if(sw){openSw=openSw===sw.dataset.sw?null:sw.dataset.sw;haptic(5);return drawSettings()}
  const pc=e.target.closest('.stg-sw [data-c]');
  if(pc){const id=pc.closest('.stg-sw').dataset.for;c.colors[id]=pc.dataset.c||null;haptic(6);applySettings();save();render();return drawSettings()}
  if(e.target.closest('#stReset')){c.names={...DEF_CFG.names};c.colors={...DEF_CFG.colors};openSw=null;applySettings();save();render();drawSettings();return toast('Stages reset')}
  if(e.target.closest('#setLists')){editing=true;nl=null;drawLists();openSheet('listSheet');onSheetClose=drawSettings;return}
  if(e.target.closest('#bkCopy')){
    const data=backupData();
    (navigator.clipboard?navigator.clipboard.writeText(data):Promise.reject()).then(()=>{S.lastBackup=Date.now();save();drawSettings();toast('Backup copied')}).catch(()=>{
      $('bkBox').classList.add('on');$('bkTxt').value=data;$('bkTxt').select();toast('Copy the text below')});
    return;
  }
  const fc=e.target.closest('[data-fcol]');if(fc){haptic(5);return setCfg('focusColor',fc.dataset.fcol)}
  if(e.target.closest('#updCheck')){UPD.latest?installUpdate():checkUpdate(true);return}
  if(e.target.closest('#bkFile')){doBackup();return}
  if(e.target.closest('#bkOpen')){$('bkBox').classList.toggle('on');$('bkTxt').value='';$('bkTxt').focus();return}
  if(e.target.closest('#bkGo')){
    const before=JSON.stringify({tasks:S.tasks,lists:S.lists,spaces:S.spaces,cfg:S.cfg,nid:S.nid,space:S.space,list:S.list});
    try{const d=JSON.parse($('bkTxt').value);if(!d||!Array.isArray(d.tasks)||!Array.isArray(d.lists))throw 0;
      const ok=d.tasks.filter(t=>t&&typeof t==='object'&&t.id!=null);if(d.tasks.length&&!ok.length)throw 0;
      const cfg=d.cfg&&typeof d.cfg==='object'?Object.assign({},DEF_CFG,d.cfg,{names:Object.assign({},DEF_CFG.names,d.cfg.names||{}),colors:Object.assign({},DEF_CFG.colors,d.cfg.colors||{})}):null;
      commit(()=>{S.tasks=d.tasks;S.lists=d.lists;S.spaces=Array.isArray(d.spaces)?d.spaces:null;S.space=null;S.nid=Math.max(+d.nid||0,S.nid||0);S.list='all';migrateSpaces();if(cfg)S.cfg=cfg},'Backup restored');
      applySettings();render();drawSettings();
    }catch(_){try{Object.assign(S,JSON.parse(before));repairData();applySettings();save();render();drawSettings()}catch(e){}toast('That backup doesn’t look right. Nothing was changed.')}
    return;
  }
  if(e.target.closest('#demo')){commit(()=>{const base=S.nid+100;
    SEED.forEach(t=>S.tasks.push({...t,id:t.id+base,subs:(t.subs||[]).map(s=>({...s})),notes:t.notes||'',repeat:t.repeat||'none'}));
    SEED_SPACES.forEach(x=>{if(!S.spaces.find(y=>y.id===x.id))S.spaces.push({...x})});SEED_LISTS.forEach(l=>{if(!S.lists.find(x=>x.id===l.id))S.lists.push({...l})});S.nid=base+50},'Demo tasks added');drawSettings();return}
  const w=e.target.closest('#wipe');
  if(w){
    if(!w.dataset.arm){w.dataset.arm=1;w.textContent='Tap again to delete everything';haptic(10);setTimeout(()=>{if(w.isConnected){delete w.dataset.arm;w.textContent='Delete all tasks'}},3000);return}
    commit(()=>S.tasks=[],'All tasks deleted');drawSettings();
  }
});
$('setIn').addEventListener('change',e=>{if(e.target.id!=='bkFileIn'||!e.target.files[0])return;
  const r=new FileReader();r.onload=()=>{$('bkTxt').value=r.result;$('bkGo').click()};r.readAsText(e.target.files[0])});
$('setIn').addEventListener('change',e=>{if(e.target.id==='avFile'){setAvatarPhoto(e.target.files&&e.target.files[0]);e.target.value=''}});
$('setIn').addEventListener('input',e=>{if(e.target.id==='youName'){S.cfg.name=e.target.value.slice(0,40);const t=$('youTitle');if(t)t.textContent=meName()||'You';drawMe();clearTimeout(window.__nmT);window.__nmT=setTimeout(()=>{save();render()},500);return}const n=e.target.dataset.name;if(n)C().names[n]=e.target.value});
$('setIn').addEventListener('change',e=>{const n=e.target.dataset.name;if(n){C().names[n]=e.target.value.trim()||DEF_CFG.names[n];applySettings();save();render();if(!e.target.value.trim())e.target.value=C().names[n]}});
$('setIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='accEmail'){e.preventDefault();return CLOUD?accSend():$('accSend').click()}if(e.key==='Enter'&&e.target.id==='accCode'){e.preventDefault();return accVerify()}if(e.target.dataset.name&&e.key==='Enter')e.target.blur()});
$('setBtn').onclick=()=>openYou();
$('dSet').onclick=openSettings;

