/* ---------- toast ---------- */
let tt,undoFn=null;
function dropUndo(){if(undoFn){undoFn=null;$('undoBtn').style.display='none';clearTimeout(tt);tt=setTimeout(()=>$('toast').classList.remove('on'),600)}}
function toast(m,undo){
  const t=$('toast');$('toastMsg').textContent=m;undoFn=undo||null;
  $('undoBtn').style.display=undo?'block':'none';
  t.classList.remove('on');void t.offsetWidth;t.classList.add('on');
  clearTimeout(tt);tt=setTimeout(()=>{t.classList.remove('on');undoFn=null},undo?4000:1800);
}
$('undoBtn').onclick=()=>{if(undoFn){const f=undoFn;undoFn=null;f();$('toast').classList.remove('on')}};

/* ---------- desktop board ---------- */
const HOUSE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>';
const PLUS_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

function renderDesk(){
  const vis=visible();
  const todayT=vis.filter(t=>t.stage==='today');
  const dateTxt=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  $('mDate').textContent=!S.space&&meName()?greeting():dateTxt;
  $('mSub').innerHTML=(!S.space&&meName()?esc(dateTxt)+' · ':'')+(todayT.length?`<b>${todayT.length}</b> ${todayT.length===1?'task':'tasks'} today, <b>${fmt(todayT.reduce((a,t)=>a+t.est,0))}</b> planned`:'Today is clear');
  document.querySelectorAll('.col').forEach(col=>{
    const sid=col.dataset.s;let here=vis.filter(t=>t.stage===sid);
    col.querySelector('.col-n').textContent=here.length;
    const sum=col.querySelector('.col-sum'),ul=col.querySelector('.col-list');
    if(sid==='done'){
      sum.innerHTML=here.length?`<span><b>${here.length}</b> finished</span>`:'';
      here=[...here].sort((a,b)=>b.doneAt-a.doneAt);let last='',out='';
      here.forEach(t=>{const lb=dayLabel(t.doneAt);if(lb!==last){out+=`<li class="day-h">${lb}</li>`;last=lb}out+=rowHTML(t)});
      ul.innerHTML=out||`<li class="col-empty">Finished tasks land here.</li>`;
    } else {
      const m=here.reduce((a,t)=>a+t.est,0);
      sum.innerHTML=here.length?`<span><b>${fmt(m)}</b> planned</span>`:'';
      if(sid==='today'){const g=$('colGo');col.classList.toggle('has-go',!!here.length);if(g)g.hidden=!here.length;}
      ul.innerHTML=here.map(rowHTML).join('')||`<li class="col-empty">Drop tasks here.</li>`;
    }
  });
  const open=id=>S.tasks.filter(t=>shown(t)&&inSpace(t)&&(id==='all'||t.list===id)&&t.stage!=='done').length;
  const spOpen=sp=>spaceStats(sp).open;
  const sub=S.space?`<div class="s-sub"><button class="s-list ${S.list==='all'?'on':''}" data-l="all" title="All lists"><span class="stack">${listsHere().slice(0,3).map(x=>`<span style="background:${x.c};border-color:var(--bg)"></span>`).join('')}</span><span class="s-name">All lists</span><span class="n">${open('all')}</span></button>`+
    listsHere().map(l=>`<button class="s-list ${S.list===l.id?'on':''}" data-l="${l.id}" title="${esc(l.name)}"><i style="background:${l.c}"></i><span class="s-name">${esc(l.name)}</span><span class="n">${open(l.id)}</span></button>`).join('')+
    `<button class="s-list s-mini" id="sNew" title="New list">${PLUS_S}<span class="s-name">New list</span></button><button class="s-list s-mini" id="sEdit" title="Edit lists"><span class="s-name">Edit lists</span></button></div>`:'';
  $('sLists').innerHTML=`<button class="s-list s-home ${!S.space?'on':''}" id="sHome" title="Home">${HOUSE}<span class="s-name">Home</span></button>
    <button class="s-list s-home ${S.space==='all'?'on':''} ${S.space==='all'&&S.subHidden?'folded':''}" id="sAll" title="All tasks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg><span class="s-name">All tasks</span></button>${S.space==='all'&&!S.subHidden?sub:''}
    <div class="s-lbl2"><span class="s-name">Spaces</span></div>`+
    orderedSpaces().map(sp=>`<button class="s-list s-sp ${S.space===sp.id?'on':''} ${S.space===sp.id&&S.subHidden?'folded':''}" data-sp="${sp.id}" title="${esc(sp.name)}"><i class="sp-sq" style="background:${sp.c}">${sp.e?`<em>${esc(sp.e)}</em>`:''}</i><span class="s-name">${esc(sp.name)}${sp.pinned?PIN_I:''}</span><span class="n">${spOpen(sp)}</span><span class="s-more" data-spedit="${sp.id}" role="button" aria-label="Edit ${esc(sp.name)}" title="Edit space"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span></button>${S.space===sp.id&&!S.subHidden?sub:''}`).join('')+
    `<button class="s-list" id="sNewSp" title="New space">${PLUS_S}<span class="s-name">New space</span></button>`;
  if(!S.space){$('dHome').innerHTML=`${todayStrip()}${backupCard()}<div class="sp-grid d-grid">${spaceCards()}</div>`}
  const gk=S.space?S.space+'|'+S.list:'';
  if(gk!==glintKey){glintKey=gk;if(gk)setTimeout(playGlint,180)}
  const sp=inSpaceMode()?spaceOf(S.space):null;
  $('mEdit').hidden=!sp;
  if(sp)$('mDate').textContent=(sp.e?sp.e+'  ':'')+sp.name;
  else if(S.space==='all')$('mDate').textContent='All tasks';
}

$('sLists').onclick=e=>{
  if(e.target.closest('#sHome'))return goHome();
  if(e.target.closest('#sAll'))return S.space==='all'?toggleSub():openSpaceSide('all');
  if(e.target.closest('#sNewSp'))return openSpaceSheet(null);
  if(e.target.closest('#sEdit')){editing=true;nl=null;drawLists();openSheet('listSheet');return}
  const se=e.target.closest('[data-spedit]');if(se){e.stopPropagation();return openSpaceSheet(se.dataset.spedit)}
  const spb=e.target.closest('[data-sp]');if(spb)return S.space===spb.dataset.sp?toggleSub():openSpaceSide(spb.dataset.sp);
  if(e.target.closest('#sNew')){editing=false;nl={name:'',c:PALETTE[S.lists.length%PALETTE.length]};drawLists();openSheet('listSheet');setTimeout(()=>$('nlIn').focus(),300);return}
  const b=e.target.closest('.s-list[data-l]');if(b){S.list=b.dataset.l;haptic(5);render()}
};
$('dMe').onclick=()=>openYou();
/* a line of light runs once around Today when a space or list opens, then the Blitz button glows */
var glintKey=null,glintT=null;
function playGlint(){
  if(!S.cfg.todayGlint||root.dataset.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches||!matchMedia('(min-width:1100px)').matches)return;
  const col=document.querySelector('.col[data-s="today"]');if(!col||(S.colFocus&&S.colFocus!=='today'))return;
  const g=col.querySelector('.glint'),b=$('colGo');if(!g)return;
  g.classList.remove('run');b&&b.classList.remove('pulse');void g.offsetWidth;g.classList.add('run');
  clearTimeout(glintT);glintT=setTimeout(()=>{g.classList.remove('run');if(b&&!b.hidden){b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),1100)}},1500);
}
$('board').addEventListener('click',e=>{if(e.target.closest('#colGo')){e.stopPropagation();$('goBtn').click()}},true);
$('dHome').addEventListener('click',e=>{if(e.target.closest('#tsGo'))$('goBtn').click()});
/* Today strip on the desktop Home: every space's Today tasks, one click to blitz them */
function todayStrip(){
  const td=bySpaceOrder(S.tasks.filter(t=>shown(t)&&t.stage==='today'));
  if(!td.length)return '';
  const m=td.reduce((a,t)=>a+t.est,0);
  return `<div class="ts"><div class="ts-l"><span class="ts-k">Today</span><b>${td.length} ${td.length===1?'task':'tasks'} · ${fmt(m)}</b></div>
    <div class="ts-t">${td.slice(0,3).map(t=>`<span><i style="background:${listOf(t.list).c}"></i>${esc(t.title)}</span>`).join('')}${td.length>3?`<span class="ts-more">+${td.length-3} more</span>`:''}</div>
    <button class="ts-go" id="tsGo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>Win the day</button></div>`;
}
$('dInstall').onclick=()=>$('installBtn').click();

/* ---------- backup reminder (only for people not signed in) ---------- */
const backupData=()=>JSON.stringify({app:'blitzit',v:8,tasks:S.tasks,lists:S.lists,spaces:S.spaces,cfg:S.cfg,nid:S.nid,tomb:S.tomb||{},cfgU:S.cfgU||0,orderU:S.orderU||0});
const canDownload=()=>CLOUD; // file downloads work in the installed app, not inside the Claude preview
function needBackup(){
  if(!S.cfg||S.cfg.backupRemind===false)return false;
  if(typeof user!=='undefined'&&user)return false;
  if(S.tasks.filter(t=>!t.archived).length<3||isDemo())return false;
  const now=Date.now();if(S.bkSnooze&&now<S.bkSnooze)return false;
  return S.lastBackup?now-S.lastBackup>7*DAY:now-(S.firstUse||now)>3*DAY;
}
const ago=ts=>{if(!ts)return 'never';const d=Math.floor((Date.now()-ts)/DAY);return d<=0?'today':d===1?'yesterday':d+' days ago'};
function backupCard(){
  if(!needBackup())return '';
  return `<div class="bk-card"><div class="bk-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg></div>
    <div class="bk-t"><b>Keep your tasks safe</b><span>${S.lastBackup?`Last backup ${ago(S.lastBackup)}.`:'They’re only saved in this browser.'} Clearing it would erase them.</span></div>
    <div class="bk-acts"><button class="bk-go" id="bkNow">Back up now</button>${CLOUD?'<button class="bk-alt" id="bkSign">Sign in to sync</button>':''}<button class="bk-alt" id="bkLater">Later</button></div></div>`;
}
async function doBackup(){
  const data=backupData();let ok=false;
  if(canDownload()){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    a.download=`blitzit-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);ok=true}catch(e){}}
  if(!ok){try{await navigator.clipboard.writeText(data);ok=true}catch(e){}}
  if(ok){S.lastBackup=Date.now();S.bkSnooze=0;save();render();if(settingsOpen())drawSettings();toast(canDownload()?'Backup file saved':'Backup copied. Paste it somewhere safe');return true}
  return false;
}

