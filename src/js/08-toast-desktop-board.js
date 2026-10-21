/* ---------- toast ---------- */
let tt,undoFn=null;
function dropUndo(){if(undoFn){undoFn=null;$('undoBtn').style.display='none';clearTimeout(tt);tt=setTimeout(()=>$('toast').classList.remove('on'),600)}}
function toast(m,undo){
  const t=$('toast');$('toastMsg').textContent=m;undoFn=undo||null;
  $('undoBtn').style.display=undo?'block':'none';
  t.classList.remove('on');void t.offsetWidth;t.classList.add('on');
  clearTimeout(tt);tt=setTimeout(()=>{t.classList.remove('on');undoFn=null},undo?4000:1800);
}
$('undoBtn').onclick=()=>{if(undoFn){sfx('undo');const f=undoFn;undoFn=null;f();$('toast').classList.remove('on')}};

/* ---------- desktop board ---------- */
const HOUSE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>';
const PLUS_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

/* Full width: on Home, clicking a space first unfolds its lists in the sidebar; picking one opens the board */
let fwPeek=null,spPage=null;
/* Full width, computer: a space card on Home opens a page of that space's lists (one list: straight to the board) */
const spPageOn=()=>peekOn()&&matchMedia('(min-width:1100px)').matches;
function spaceListsPage(sp){
  const ls=S.lists.filter(l=>l.space===sp.id),st=id=>{const ts=S.tasks.filter(t=>shown(t)&&listOf(t.list).space===sp.id&&(id==='all'||t.list===id));return {today:ts.filter(t=>t.stage==='today').length,open:ts.filter(t=>t.stage!=='done').length}};
  const card=(id,name,ico,c,i)=>{const s=st(id);return `<div class="lp-card" role="button" tabindex="0" data-lp="${id}" style="--sc:${c};animation-delay:${i*.04}s"><span class="lp-ico">${ico}</span><span class="lp-name">${esc(name)}</span><span class="lp-meta">${s.today?`<b>${s.today}</b> today · `:''}${s.open} open</span>${id==='all'?'':lpMenu(id,ls.length===1)}</div>`};
  return `<button class="lp-back" data-spback>${BACK_SVG}<span>All spaces</span></button>
    <div class="lp-grid">${card('all','All lists',`<span class="stack">${ls.slice(0,3).map(x=>`<span style="background:${x.c}"></span>`).join('')}</span>`,sp.c,0)}
    ${ls.map((l,i)=>card(l.id,l.name,'',l.c,i+1)).join('')}
    <button class="lp-new" data-lpnew style="animation-delay:${(ls.length+1)*.04}s">${PLUS_S}<span>New list</span></button></div>`;
}
/* ⋯ on a list card: rename, colour, move to another space, tags, archive, delete */
function lpMenu(id,only){
  const l=S.lists.find(x=>x.id===id);if(!l)return '';
  const others=S.spaces.filter(x=>x.id!==l.space);
  return `<button class="lp-more" data-lpm="${id}" aria-label="List options" title="List options">${DOTS3}</button>
  <div class="sp-pop lp-pop" data-lpop="${id}">
    <button data-lpren="${id}"><span class="lpm-i">${PEN_S}</span>Rename</button>
    <div class="lpm-lbl">Colour</div><div class="lpm-sw">${PALETTE.map(c=>`<button data-lpc="${c}" data-lpl="${id}" class="${l.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>
    ${others.length?`<div class="lpm-lbl">Move to</div>${only?`<p class="lpm-note">It’s the only list in this space, so it stays here.</p>`:`<div class="lpm-sp">${others.map(x=>`<button data-lpmv="${x.id}" data-lpl="${id}"><span class="sp-mini" style="background:${x.c}">${x.e?esc(x.e):esc((x.name[0]||'?').toUpperCase())}</span>${esc(x.name)}</button>`).join('')}</div>`}`:''}
    <i class="lpm-hr"></i>
    <button data-lped="${id}"><span class="lpm-i">${TAG_S}</span>Tags and more…</button>
    ${only?'':`<button data-lparc="${id}"><span class="lpm-i">${ARC_S}</span>Archive list</button><button class="warn" data-lpdel="${id}"><span class="lpm-i">${BIN_S}</span>Delete list</button>`}
  </div>`;
}
const GEAR_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>';
const PEN_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const TAG_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>';
const ARC_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10h14V9M10 13h4"/></svg>';
const BIN_S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
$('listsMore').innerHTML=DOTS3;document.querySelectorAll('.le-bi').forEach(x=>x.innerHTML=x.dataset.ic==='arc'?ARC_S:BIN_S);$('lmEditI').innerHTML=PEN_S;$('lmSpaceI').innerHTML=GEAR_S;
const peekOn=()=>!!(S.cfg&&S.cfg.fullWidth&&!S.space);
function peekSub(sp){
  const ls=S.lists.filter(l=>l.space===sp.id),n=id=>S.tasks.filter(t=>shown(t)&&listOf(t.list).space===sp.id&&(id==='all'||t.list===id)&&t.stage!=='done').length;
  return `<div class="s-sub s-peek"><button class="s-list" data-pk="${sp.id}" data-pl="all" title="All lists"><span class="stack">${ls.slice(0,3).map(x=>`<span style="background:${x.c};border-color:var(--bg)"></span>`).join('')}</span><span class="s-name">All lists</span><span class="n">${n('all')}</span></button>`+
    ls.map(l=>`<button class="s-list" data-pk="${sp.id}" data-pl="${l.id}" title="${esc(l.name)}"><i style="background:${l.c}"></i><span class="s-name">${esc(l.name)}</span><span class="n">${n(l.id)}</span></button>`).join('')+`</div>`;
}
function renderDesk(){
  const vis=visible();
  // on Home, count every space's Today (like the Today strip); inside a space, what the board shows
  const todayT=(S.space?vis:S.tasks.filter(t=>shown(t))).filter(t=>t.stage==='today');
  const dateTxt=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  const greet=!S.space&&meName();$('mDate').classList.toggle('has-sun',!!greet);if(greet)$('mDate').innerHTML=sunIcon('m-sun')+'<span>'+esc(greeting())+'</span>';else $('mDate').textContent=dateTxt;
  $('mSub').innerHTML=(!S.space&&meName()?esc(dateTxt)+' · ':'')+(todayT.length?`<b>${todayT.length}</b> ${todayT.length===1?'task':'tasks'} today, <b>${fmt(todayT.reduce((a,t)=>a+t.est,0))}</b> planned`:'Today is clear');
  document.querySelectorAll('.col').forEach(col=>{
    const sid=col.dataset.s;let here=vis.filter(t=>t.stage===sid);if(sid!=='done')here=priSorted(here);
    const cn=col.querySelector('.col-n'),one=inSpaceMode()&&S.list!=='all'&&sid!=='done';
    cn.textContent=one?`${here.length}/${STAGE_MAX}`:here.length;cn.classList.toggle('full',one&&here.length>=STAGE_MAX);cn.classList.toggle('over',one&&here.length>STAGE_MAX);
    const sum=col.querySelector('.col-sum'),ul=col.querySelector('.col-list');
    if(sid==='done'){
      sum.innerHTML=here.length?`<span><b>${here.length}</b> finished</span>`:'';
      const out=doneRows(here);
      ul.innerHTML=out||`<li class="col-empty">Finished tasks land here.</li>`;
    } else {
      const m=here.reduce((a,t)=>a+t.est,0);
      sum.innerHTML=here.length?`<span><b>${fmt(m)}</b> planned</span>`:'';
      if(sid==='today'){const g=$('colGo');col.classList.toggle('has-go',!!here.length);if(g)g.hidden=!here.length;}
      ul.innerHTML=(here.length||!secOn()?'':`<li class="col-empty">Drop tasks here.</li>`)+colRows(here,sid,'d:'+sid)||`<li class="col-empty">Drop tasks here.</li>`;
      const cs=col.querySelector('.ca-sec');if(cs)cs.hidden=!canAddSec();
    }
  });
  const open=id=>S.tasks.filter(t=>shown(t)&&inSpace(t)&&(id==='all'||t.list===id)&&t.stage!=='done').length;
  const spOpen=sp=>spaceStats(sp).open;
  const sub=S.space?`<div class="s-sub"><button class="s-list ${S.list==='all'?'on':''}" data-l="all" title="All lists"><span class="stack">${listsHere().slice(0,3).map(x=>`<span style="background:${x.c};border-color:var(--bg)"></span>`).join('')}</span><span class="s-name">All lists</span><span class="n">${open('all')}</span></button>`+
    listsHere().map(l=>`<button class="s-list ${S.list===l.id?'on':''}" data-l="${l.id}" title="${esc(l.name)}"><i style="background:${l.c}"></i><span class="s-name">${esc(l.name)}</span><span class="n">${open(l.id)}</span></button>`).join('')+
    `<button class="s-list s-mini" id="sNew" title="New list">${PLUS_S}<span class="s-name">New list</span></button><button class="s-list s-mini" id="sEdit" title="Edit lists"><span class="s-name">Edit lists</span></button></div>`:'';
  $('sLists').innerHTML=`<button class="s-list s-home ${!S.space&&!ibOn?'on':''}" id="sHome" title="Home">${HOUSE}<span class="s-name">Home</span></button>
    <button class="s-list s-home ${S.space==='all'&&!ibOn?'on':''} ${S.space==='all'&&S.subHidden?'folded':''}" id="sAll" title="All tasks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg><span class="s-name">All tasks</span></button>${S.space==='all'&&!S.subHidden?sub:''}${inboxOn()?(()=>{const n=inboxItems().length;return `<button class="s-list s-home s-inbox ${ibOn?'on':''}" id="sInbox" title="Inbox">${IB_ICON}<span class="s-name">Inbox</span>${n?`<span class="n">${n}</span>`:''}</button>`})():''}
    <div class="s-lbl2"><span class="s-name">Spaces</span></div>`+
    orderedSpaces().map(sp=>`<button class="s-list s-sp ${S.space===sp.id||(peekOn()&&fwPeek===sp.id)?'on':''} ${S.space===sp.id&&S.subHidden?'folded':''}" data-sp="${sp.id}" title="${esc(sp.name)}"><i class="sp-sq" style="background:${sp.c}">${sp.e?`<em>${esc(sp.e)}</em>`:''}</i><span class="s-name">${esc(sp.name)}${sp.pinned?PIN_I:''}</span><span class="n">${spOpen(sp)}</span><span class="s-more" data-spedit="${sp.id}" role="button" aria-label="Edit ${esc(sp.name)}" title="Edit space"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span></button>${S.space===sp.id&&!S.subHidden?sub:''}${peekOn()&&fwPeek===sp.id?peekSub(sp):''}`).join('')+
    `<button class="s-list" id="sNewSp" title="New space">${PLUS_S}<span class="s-name">New space</span></button>`;
  const spp=!S.space&&spPage&&spPageOn()?spaceOf(spPage):null;if(!spp)spPage=null;
  if(!S.space){$('dHome').innerHTML=spp?spaceListsPage(spp):(C().homeLayout==='today'?todayFirst():`${todayStrip()}${backupCard()}<div class="sp-grid d-grid">${spaceCards()}</div>`)}
  const gk=S.space?S.space+'|'+S.list:'';
  if(gk!==glintKey){glintKey=gk;if(gk)setTimeout(playGlint,180)}
  const sp=inSpaceMode()?spaceOf(S.space):null;
  $('mEdit').hidden=!sp;
  if(sp)$('mDate').textContent=(sp.e?sp.e+'  ':'')+sp.name;
  else if(S.space==='all')$('mDate').textContent='All tasks';
  if(spp){$('mDate').textContent=(spp.e?spp.e+'  ':'')+spp.name;const s=spaceStats(spp);$('mSub').innerHTML=`<b>${s.today}</b> today · <b>${s.open}</b> open · ${s.lists} ${s.lists===1?'list':'lists'}`}
  renderFullWidth();
}

$('sLists').onclick=e=>{
  if(e.target.closest('#sInbox'))return ibOn?closeInbox():openInbox();
  if(ibOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l]'))closeInbox();
  if(e.target.closest('#sHome'))return goHome();
  if(e.target.closest('#sAll'))return S.space==='all'?toggleSub():openSpaceSide('all');
  if(e.target.closest('#sNewSp'))return openSpaceSheet(null);
  if(e.target.closest('#sEdit')){editing=true;nl=null;drawLists();openSheet('listSheet');return}
  const se=e.target.closest('[data-spedit]');if(se){e.stopPropagation();return openSpaceSheet(se.dataset.spedit)}
  const pl=e.target.closest('[data-pl]');if(pl){const id=pl.dataset.pk,l=pl.dataset.pl;fwPeek=null;openSpaceSide(id);S.list=l;haptic(5);render();return}
  const spb=e.target.closest('[data-sp]');if(spb){if(peekOn()){fwPeek=fwPeek===spb.dataset.sp?null:spb.dataset.sp;haptic(5);render();return}return S.space===spb.dataset.sp?toggleSub():openSpaceSide(spb.dataset.sp)}
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
  const m=td.reduce((a,t)=>a+t.est,0),nx=td[0];
  return `<div class="ts"><div class="ts-l"><span class="ts-k">Today</span><b>${td.length} ${td.length===1?'task':'tasks'} · ${fmt(m)}</b></div>
    <div class="ts-up"><span>Up next</span><b>${esc(nx.title)}</b></div>
    <button class="ts-go" id="tsGo">${sunIcon()}Win the day</button></div>`;
}

/* Home layout "Today first" (Settings → Appearance): the real Today list to tick off, spaces in a slim column */
function todayFirst(){
  const td=bySpaceOrder(S.tasks.filter(t=>shown(t)&&t.stage==='today')),m=td.reduce((a,t)=>a+t.est,0);
  const rows=td.map(t=>{const l=listOf(t.list),sp=spaceOf(l.space)||{};
    return `<div class="hf-tk" data-hft="${t.id}" role="button" tabindex="0"><button class="hf-ck" data-hfdone="${t.id}" aria-label="Complete ${esc(t.title)}"></button>
      <span class="hf-t"><b>${esc(t.title)}</b><small>${sp.e?esc(sp.e)+' ':''}${esc(sp.name||'')}<i style="background:${l.c}"></i>${esc(l.name)}</small></span><span class="hf-e">${fmt(t.est)}</span></div>`}).join('');
  const side=orderedSpaces().map(sp=>{const st=spaceStats(sp);
    return `<button class="hf-sp" data-space="${sp.id}"><span class="hf-sph"><span class="hf-ic">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><b>${esc(sp.name)}</b><span class="hf-n">${st.today?st.today+' today':st.open?st.open+' open':'Clear'}</span></span>
      <span class="sp-bars">${st.total?VS().map(x=>st.by[x.id]?`<i style="flex:${st.by[x.id]};background:var(--${x.id})"></i>`:'').join(''):'<i class="sp-bars-0"></i>'}</span></button>`}).join('');
  return `${backupCard()}<div class="hf"><section class="hf-main"><div class="hf-head"><div><span class="ts-k">Today</span><b>${td.length?`${td.length} ${td.length===1?'task':'tasks'} · ${fmt(m)}`:'Nothing planned yet'}</b></div>${td.length?`<button class="ts-go" id="tsGo">${sunIcon()}Win the day</button>`:''}</div>
    ${rows||`<p class="hf-empty">Open a space and move a few tasks to Today. They’ll show up here, ready to tick off.</p>`}</section>
    <aside class="hf-side"><div class="hf-cap">Spaces</div>${side}<button class="hf-new" id="spNew">${PLUS_S}New space</button></aside></div>`;
}
$('dHome').addEventListener('click',e=>{
  const ck=e.target.closest('[data-hfdone]');if(ck){e.stopPropagation();const t=S.tasks.find(x=>x.id===+ck.dataset.hfdone);if(!t)return;
    const row=ck.closest('.hf-tk');row.classList.add('done');haptic(10);setTimeout(()=>commit(()=>setStage(t,'done'),doneMsg(t)),260);return}
  const r=e.target.closest('[data-hft]');if(r)openDetail(+r.dataset.hft);
});
$('dHome').addEventListener('keydown',e=>{const r=e.target.closest('[data-hft]');if(r&&e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openDetail(+r.dataset.hft)}});

/* ---------- backup reminder (only for people not signed in) ---------- */
const backupData=()=>JSON.stringify({app:'blitzit',v:8,tasks:S.tasks,lists:S.lists,spaces:S.spaces,arch:S.arch||[],cfg:S.cfg,nid:S.nid,tomb:S.tomb||{},cfgU:S.cfgU||0,orderU:S.orderU||0});
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

