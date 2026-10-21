/* ---------- sheets ---------- */
let onSheetClose=null;
function openSheet(id){$('scrim').classList.add('on');$(id).classList.add('on')}
function closeSheets(){
  const ae=document.activeElement;if(ae&&ae.closest&&ae.closest('.sheet'))ae.blur();
  if(!settingsOpen())$('scrim').classList.remove('on');document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('on'));
  if(onSheetClose){const f=onSheetClose;onSheetClose=null;f()}
}
$('scrim').onclick=()=>document.querySelector('.sheet.on')?closeSheets():settingsOpen()?closeSettings():closeSheets();
const opt=(on,v,label,dot)=>`<button class="opt ${on?'on':''}" data-v="${v}">${dot?`<i style="background:${dot}"></i>`:''}${esc(label)}</button>`;

/* add sheet */
let draft;
function drawAdd(){
  const pickSpace=!inSpaceMode()&&S.spaces.length>1;
  $('addSpaceWrap').hidden=!pickSpace;
  if(pickSpace)$('optSpace').innerHTML=orderedSpaces().map(sp=>`<button class="opt sp-opt ${draft.space===sp.id?'on':''}" data-v="${sp.id}"><span class="sp-mini" style="background:${sp.c}">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span>${esc(sp.name)}</button>`).join('');
  const ls=S.lists.filter(l=>l.space===draft.space);
  $('addListWrap').hidden=ls.length<2;
  $('optList').innerHTML=ls.map(l=>opt(draft.list===l.id,l.id,l.name,l.c)).join('');
  $('optStage').innerHTML=STAGES.filter(s=>s.id!=='done').map(s=>opt(draft.stage===s.id,s.id,s.name,color(s.id))).join('');
  $('optEst').innerHTML=[15,30,60,120].map(m=>opt(draft.est===m,m,fmt(m))).join('');
  $('saveBtn').style.background=color(draft.stage);
}
$('addBtn').onclick=()=>{
  const dl=defaultList(),sp0=inSpaceMode()?S.space:(S.space==='all'?listOf(dl).space:orderedSpaces()[0].id);
  const first=S.lists.find(l=>l.space===sp0);
  draft={stage:!S.space||S.stage==='done'?'today':S.stage,space:sp0,list:listOf(dl).space===sp0?dl:(first||{}).id,est:S.cfg.defEst};
  $('newTitle').value='';$('saveBtn').disabled=true;drawAdd();openSheet('addSheet');
  setTimeout(()=>{if($('addSheet').classList.contains('on'))$('newTitle').focus()},300);
};
$('optSpace').onclick=e=>{const b=e.target.closest('.opt');if(!b)return;draft.space=b.dataset.v;
  const ls=S.lists.filter(l=>l.space===draft.space),d=S.cfg.defList;draft.list=(ls.find(l=>l.id===d)||ls[0]||{}).id;haptic(5);drawAdd()};
$('optStage').onclick=e=>{const b=e.target.closest('.opt');if(b){draft.stage=b.dataset.v;drawAdd()}};
$('optList').onclick=e=>{const b=e.target.closest('.opt');if(b){draft.list=b.dataset.v;drawAdd()}};
$('optEst').onclick=e=>{const b=e.target.closest('.opt');if(b){draft.est=+b.dataset.v;drawAdd()}};
$('newTitle').oninput=e=>$('saveBtn').disabled=!e.target.value.trim();
$('newTitle').onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim())$('saveBtn').click()};
let addLock=0;
$('saveBtn').onclick=()=>{
  if(Date.now()-addLock<700)return;addLock=Date.now(); // ignore accidental double taps
  const nt=newTask($('newTitle').value.trim(),draft.stage,draft.list,draft.est);addTask(nt);enterId=nt.id;haptic(8);
  closeSheets();const d=idx(draft.stage)-idx(S.stage);S.stage=draft.stage;render(d||undefined);
  if(!inSpaceMode()){const sp=spaceOf(draft.space);if(sp)toast(`Added to ${sp.name}`)}
};

/* detail sheet */
let cur=null,pickOpen=null;
const grow=el=>{el.style.height='auto';el.style.height=el.scrollHeight+'px'};
const ESTS=[15,30,45,60,90,120];
function openDetail(id){
  cur=S.tasks.find(x=>x.id===id);if(!cur)return;haptic(5);setDetailWide(detailWide());
  pickOpen=null;$('dMenu').classList.remove('on');$('dMore').classList.remove('on');
  $('detailSheet').classList.remove('full');$('dScroll').scrollTop=0;
  $('dTitle').value=cur.title;$('dNotes').value=cur.notes;$('dSubIn').value='';
  drawDetail();openSheet('detailSheet');
  requestAnimationFrame(()=>{grow($('dTitle'));grow($('dNotes'))});
  onSheetClose=()=>{if(cur&&!cur.title.trim())cur.title='Untitled';cur=null;$('detailSheet').classList.remove('full');render()};
}
/* ---------- tags: each list keeps its own tags (list settings); a task picks from its list's tags ---------- */
const I_TAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>';
const tagsOf=t=>Array.isArray(t.tags)?t.tags:[];
const ltags=l=>Array.isArray(l.tags)?l.tags:(l.tags=[]);
const tagKey=s=>String(s).trim().toLowerCase();
const tagClean=s=>String(s||'').replace(/^#+/,'').replace(/\s+/g,' ').trim().slice(0,24);
function addListTag(l,name){name=tagClean(name);if(!name||!l)return null;const ex=ltags(l).find(x=>tagKey(x)===tagKey(name));if(ex)return ex;l.tags.push(name);return name}
function toggleTaskTag(t,name){const has=tagsOf(t).some(x=>tagKey(x)===tagKey(name));t.tags=has?tagsOf(t).filter(x=>tagKey(x)!==tagKey(name)):[...tagsOf(t),name]}
/* moving a task to another list brings its tags along */
function carryTags(t){if(!tagsOf(t).length)return;const l=listOf(t.list);t.tags=tagsOf(t).map(n=>addListTag(l,n)).filter(Boolean)}
const tagChips=(t,max)=>{const a=tagsOf(t);if(!a.length)return '';return a.slice(0,max).map(n=>`<span class="ttag">#${esc(n)}</span>`).join('')+(a.length>max?`<span class="ttag more">+${a.length-max}</span>`:'')};
function drawDetail(){
  const t=cur;if(!t)return;
  $('detailSheet').style.setProperty('--accent',color(t.stage==='done'?'done':t.stage));
  const l=listOf(t.list),st=STAGES[idx(t.stage)],rp=REPEATS.find(r=>r.id===t.repeat);
  const P=(k,inner,muted)=>`<button class="pill ${pickOpen===k?'open':''} ${muted?'muted':''}" data-p="${k}">${inner}</button>`;
  $('dPills').innerHTML=
    P('stage',`<i style="background:${color(t.stage)}"></i>${esc(st.name)}`)+
    P('list',`<i style="background:${l.c}"></i>${esc(l.name)}`)+
    P('est',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmt(t.est)}`)+
    P('repeat',`${I_REP}${t.repeat==='none'?'Repeat':rp.name}`,t.repeat==='none')+
    P('pri',priOf(t)?`${priIcon(priOf(t).n)}${priOf(t).name}`:`${priIcon(0)}Priority`,!priOf(t))+
    (secOn()&&t.stage!=='done'&&secsForTask(t).length?P('sec',`${I_SEC}${secOfTask(t)?esc(secOfTask(t).name):'Section'}`,!secOfTask(t)):'')+
    P('tags',tagsOf(t).length?`${I_TAG}${tagsOf(t).map(n=>`<span class="pl-tg">#${esc(n)}</span>`).join('')}`:`${I_TAG}Tags`,!tagsOf(t).length);
  const pk=(on,v,label,dot)=>`<button class="pk ${on?'on':''}" data-v="${v}">${dot?`<i style="background:${dot}"></i>`:''}${esc(label)}</button>`;
  const pick=$('dPicker');
  if(pickOpen){
    pick.dataset.k=pickOpen;
    pick.innerHTML={stage:()=>STAGES.map(s=>pk(t.stage===s.id,s.id,s.name,color(s.id))).join(''),
      list:()=>S.lists.map(x=>pk(t.list===x.id,x.id,S.spaces.length>1&&!inSpaceMode()?`${(spaceOf(x.space)||{}).name} › ${x.name}`:x.name,x.c)).filter((h,i)=>!inSpaceMode()||S.lists[i].space===S.space||S.lists[i].id===t.list).join(''),
      est:()=>ESTS.map(m=>pk(t.est===m,m,fmt(m))).join(''),
      repeat:()=>REPEATS.map(r=>pk(t.repeat===r.id,r.id,r.name)).join(''),
      pri:()=>pk(!priOf(t),'','None')+PRIS.map(p=>`<button class="pk pk-pri ${t.pri===p.id?'on':''}" data-v="${p.id}">${priIcon(p.n)}${p.name}</button>`).join(''),
      sec:()=>pk(!secOfTask(t),'','No section')+secsForTask(t).map(s=>pk((secOfTask(t)||{}).id===s.id,s.id,s.name)).join(''),
      tags:()=>{const lt=ltags(l),on=n=>tagsOf(t).some(x=>tagKey(x)===tagKey(n));
        return lt.map(n=>`<button class="pk tg-pk ${on(n)?'on':''}" data-v="${esc(n)}">#${esc(n)}</button>`).join('')+
        `<input class="pk-in" id="dTagIn" maxlength="24" placeholder="${lt.length?'New tag':'Add a tag'}" enterkeyhint="done" autocomplete="off">`+
        (lt.length?`<button class="pk-link" data-tagmng>Manage</button>`:'')}}[pickOpen]();
    pick.classList.add('on');
  } else pick.classList.remove('on');
  const sd=t.subs.filter(s=>s.done).length;
  $('dStepsHead').hidden=$('dProg').hidden=!t.subs.length;
  $('dStepCount').textContent=`${sd} of ${t.subs.length}`;
  $('dProgBar').style.width=t.subs.length?(sd/t.subs.length*100)+'%':'0';
  $('dSubs').innerHTML=t.subs.map(s=>`<div class="sub ${s.done?'on':''}" data-s="${s.id}">
    <button class="sc" aria-label="Toggle step">${CHECK}</button><textarea class="s-t" rows="1" maxlength="200" aria-label="Step name" spellcheck="false">${esc(s.t)}</textarea>
    <button class="sx" aria-label="Remove step">${X}</button></div>`).join('');
  $('dSubs').querySelectorAll('.s-t').forEach(grow);
  const done=t.stage==='done';
  requestAnimationFrame(subsFade);
  $('dComplete').textContent=done?'Mark as not done':'Complete';
  $('dComplete').classList.toggle('undo',done);
  $('dFocus').hidden=done;
  save();
}
$('dPicker').addEventListener('keydown',e=>{if(e.target.id!=='dTagIn')return;
  if(e.key==='Enter'){e.preventDefault();const t=cur,n=addListTag(listOf(t.list),e.target.value);if(!n)return;
    if(!tagsOf(t).some(x=>tagKey(x)===tagKey(n)))t.tags=[...tagsOf(t),n];haptic(6);save();render();drawDetail();setTimeout(()=>$('dTagIn')&&$('dTagIn').focus(),0)}
  if(e.key==='Escape'){e.stopPropagation();pickOpen=null;drawDetail()}});
$('dPills').onclick=e=>{const b=e.target.closest('.pill');if(!b)return;pickOpen=pickOpen===b.dataset.p?null:b.dataset.p;haptic(5);drawDetail()};
$('dPicker').onclick=e=>{
  if(e.target.closest('[data-tagmng]')){const t=cur;pickOpen=null;closeSheets();setTimeout(()=>{editing=true;nl=null;leOpen=t.list;drawLists();openSheet('listSheet');
    onSheetClose=()=>{if(S.tasks.includes(t))setTimeout(()=>openDetail(t.id),260)}},260);return}
  const b=e.target.closest('.pk');if(!b)return;const k=$('dPicker').dataset.k,v=b.dataset.v,t=cur;
  if(k==='tags'){toggleTaskTag(t,v);haptic(5);save();render();return drawDetail()}
  pickOpen=null;haptic(6);
  if(k==='stage'){if(v!==t.stage)commit(()=>setStage(t,v),v==='done'?doneMsg(t):`Moved to ${STAGES[idx(v)].name}`)}
  else if(k==='list'){t.list=v;carryTags(t)}
  else if(k==='est')t.est=+v;
  else if(k==='repeat')t.repeat=v;
  else if(k==='pri'){if(v)t.pri=v;else delete t.pri}
  else if(k==='sec'){if(v)t.sec=v;else delete t.sec}
  if(k!=='stage'){save();render()}
  drawDetail();
};
$('dTitle').oninput=e=>{cur.title=e.target.value.replace(/\n/g,' ');grow(e.target);save()};
$('dTitle').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('dSubIn').focus()}};
$('dNotes').oninput=e=>{cur.notes=e.target.value;grow(e.target);save()};
$('dSubIn').onkeydown=e=>{
  if(e.key!=='Enter')return;e.preventDefault();const v=e.target.value.trim();if(!v)return;
  cur.subs.push({id:newId(),t:v,done:false});e.target.value='';haptic(6);drawDetail();
  const box=$('dSubs');box.scrollTop=box.scrollHeight;subsFade();
};
function subsFade(){const b=$('dSubs');if(!b)return;b.classList.toggle('at-end',b.scrollTop+b.clientHeight>=b.scrollHeight-4);b.classList.toggle('scrolled',b.scrollTop>4)}
$('dSubs').addEventListener('scroll',subsFade);
$('dSubs').onclick=e=>{
  const r=e.target.closest('.sub');if(!r)return;const s=cur.subs.find(x=>x.id===+r.dataset.s);
  if(e.target.closest('.sx')){const t=cur;
    confirmAsk({title:'Delete this step?',text:`“${s.t}” will be removed from this task.`,yes:'Yes, delete',no:'No',
      onYes:()=>{t.subs=t.subs.filter(x=>x!==s);haptic(8);save();render();if(cur===t)drawDetail()}});return}
  if(!e.target.closest('.sc'))return;   /* only the circle ticks a step; the text is for editing */
  s.done=!s.done;haptic(8);sfx(s.done?'tick':'undone');drawDetail();
};
/* rename a step: click its text, type, Enter or click away to keep, Esc to undo the edit */
$('dSubs').addEventListener('input',e=>{const ta=e.target.closest('.s-t');if(!ta)return;const s=cur.subs.find(x=>x.id===+ta.closest('.sub').dataset.s);
  if(!ta.dataset.old)ta.dataset.old=s.t;const v=ta.value.replace(/\n/g,' ');if(v!==ta.value)ta.value=v;if(v.trim())s.t=v.trim();grow(ta);save()});
$('dSubs').addEventListener('keydown',e=>{const ta=e.target.closest('.s-t');if(!ta)return;
  if(e.key==='Enter'){e.preventDefault();ta.blur()}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const s=cur.subs.find(x=>x.id===+ta.closest('.sub').dataset.s);if(ta.dataset.old){s.t=ta.dataset.old;ta.value=s.t;save()}ta.blur()}});
$('dSubs').addEventListener('focusout',e=>{const ta=e.target.closest('.s-t');if(!ta)return;const s=cur&&cur.subs.find(x=>x.id===+ta.closest('.sub').dataset.s);
  if(s&&!ta.value.trim())ta.value=s.t;delete ta.dataset.old;render()});
$('dClose').onclick=closeSheets;
/* focus view (computer): the task opens big in the middle of the screen; remembered on this device */
const detailWide=()=>{try{return localStorage.getItem('detailWide')==='1'}catch(e){return false}};
function setDetailWide(on){$('detailSheet').classList.toggle('wide',on);$('dWide').setAttribute('aria-pressed',on);$('dWide').title=on?'Back to side panel':'Focus view';
  try{localStorage.setItem('detailWide',on?'1':'0')}catch(e){}}
$('dWide').onclick=()=>{setDetailWide(!$('detailSheet').classList.contains('wide'));haptic(5);$('dSubs').querySelectorAll('.s-t').forEach(grow);grow($('dTitle'));grow($('dNotes'))};
$('dMore').onclick=e=>{e.stopPropagation();const on=$('dMenu').classList.toggle('on');$('dMore').classList.toggle('on',on);haptic(5)};
$('detailSheet').addEventListener('click',e=>{if(!e.target.closest('#dMenu,#dMore')){$('dMenu').classList.remove('on');$('dMore').classList.remove('on')}});
$('dDel').onclick=()=>{const t=cur;if(!t)return;$('dMenu').classList.remove('on');$('dMore').classList.remove('on');
  confirmAsk({title:'Delete this task?',text:`“${t.title||'Untitled'}” will be deleted for good. To keep it safe, choose Archive task instead.`,yes:'Yes, delete',no:'No',
    onYes:()=>{if(cur===t){cur=null;onSheetClose=null;closeSheets()}haptic(10);sfx('remove');render();commit(()=>S.tasks=S.tasks.filter(x=>x!==t),'Task deleted')}})};
$('dArc').onclick=()=>{const t=cur;if(!t)return;cur=null;onSheetClose=null;closeSheets();haptic(8);sfx('remove');render();
  commit(()=>archiveTask(t),'Task archived')};
$('dDup').onclick=()=>{
  const t=cur;const c={...JSON.parse(JSON.stringify(t)),id:newId(),title:t.title+' (copy)'};delete c.spawned;delete c.doneAt;
  if(c.stage==='done')c.stage='today';c.subs.forEach(s=>s.id=newId());
  $('dMenu').classList.remove('on');
  commit(()=>{S.tasks.splice(S.tasks.indexOf(t)+1,0,c);enterId=c.id},'Duplicated');
  openDetail(c.id);
};
$('dComplete').onclick=()=>{
  const t=cur,toDone=t.stage!=='done';haptic(14);
  closeSheets();
  setTimeout(()=>commit(()=>setStage(t,toDone?'done':'today'),toDone?doneMsg(t):'Moved to Today'),200);
};
$('dFocus').onclick=()=>{const t=cur;closeSheets();setTimeout(()=>startBlitz([t]),250)};

/* swipe down to close: every bottom sheet on phones */
let sheetSwipe=null;
const SHEET_SKIP='textarea,.row-scroll,.ico-grid,#dDrag';
document.addEventListener('touchstart',e=>{
  if(matchMedia('(min-width:1100px)').matches||e.touches.length>1)return;
  const sheet=e.target.closest('.sheet.on');if(!sheet||e.target.closest(SHEET_SKIP))return;
  // every scrollable box between the finger and the sheet: a pull-down only closes when all are at the top
  const sc=[];for(let n=e.target;n&&n!==sheet.parentNode;n=n.parentElement){if(n.scrollHeight>n.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(n).overflowY))sc.push(n)}
  sheetSwipe={sheet,sc,y:e.touches[0].clientY,x:e.touches[0].clientX,dy:0,t:Date.now(),on:false};
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!sheetSwipe)return;const t=e.touches[0],dy=t.clientY-sheetSwipe.y,dx=t.clientX-sheetSwipe.x;
  if(!sheetSwipe.on){
    if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){sheetSwipe=null;return}           // sideways: let it be
    if(dy<-6||(dy>0&&sheetSwipe.sc.some(x=>x.scrollTop>0))){sheetSwipe=null;return}               // scrolling content
    if(dy<8)return;
    sheetSwipe.on=true;sheetSwipe.lt=Date.now();sheetSwipe.dy=0;sheetSwipe.sheet.style.transition='none';$('scrim').style.transition='none';
  }
  e.preventDefault();const now=Date.now(),ny=Math.max(0,dy);if(now>sheetSwipe.lt)sheetSwipe.v=(ny-sheetSwipe.dy)/(now-sheetSwipe.lt);sheetSwipe.lt=now;sheetSwipe.dy=ny;
  sheetSwipe.sheet.style.transform=`translateY(${sheetSwipe.dy}px)`;
  $('scrim').style.opacity=String(Math.max(0,1-sheetSwipe.dy/(sheetSwipe.sheet.offsetHeight||600)));
},{passive:false});
function endSheetSwipe(){
  if(!sheetSwipe)return;const d=sheetSwipe;sheetSwipe=null;if(!d.on)return;
  const fast=d.dy>30&&(d.v||0)>.3,far=d.dy>Math.min(140,d.sheet.offsetHeight*.25);
  d.sheet.style.transition='';$('scrim').style.transition='';$('scrim').style.opacity='';
  if(fast||far){
    if(d.sheet.classList.contains('full')){d.sheet.style.transform='';d.sheet.classList.remove('full');haptic(6);return}
    d.sheet.style.transform='';haptic(6);closeSheets();
  } else d.sheet.style.transform='';
}
document.addEventListener('touchend',endSheetSwipe);
document.addEventListener('touchcancel',endSheetSwipe);

/* drag sheet (mobile) */
let ds=null;
$('dDrag').addEventListener('pointerdown',e=>{
  if(matchMedia('(min-width:1100px)').matches||e.target.closest('button'))return;
  ds={y:e.clientY,dy:0};$('detailSheet').classList.add('drag');try{$('dDrag').setPointerCapture(e.pointerId)}catch(_){}
});
$('dDrag').addEventListener('pointermove',e=>{
  if(!ds)return;ds.dy=e.clientY-ds.y;const full=$('detailSheet').classList.contains('full');
  const y=ds.dy>0?ds.dy:(full?ds.dy*.15:ds.dy*.35);
  $('detailSheet').style.transform=`translateY(${y}px)`;
});
function endSheetDrag(){
  if(!ds)return;const d=ds.dy,sh=$('detailSheet');ds=null;sh.classList.remove('drag');sh.style.transform='';
  const full=sh.classList.contains('full');
  if(d<-50&&!full){sh.classList.add('full');haptic(6)}
  else if(d>90&&full){sh.classList.remove('full');haptic(6)}
  else if(d>90){closeSheets()}
}
$('dDrag').addEventListener('pointerup',endSheetDrag);
$('dDrag').addEventListener('pointercancel',endSheetDrag);

/* lists sheet */
let editing=false,nl=null,leOpen=null;
let leSub=null; // which part of the open list editor is unfolded: 'c' colour, 's' space, 't' tags
const LX_CHEV='<svg class="lx-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
/* one foldable row: label and current value on top, the choices slide open underneath */
const lxRow=(key,label,value,body,open)=>`<div class="lx${open?' on':''}" data-lx="${key}"><button class="lx-h" type="button" data-lxt="${key}" aria-expanded="${!!open}"><span class="lx-l">${label}</span><span class="lx-v">${value}</span>${LX_CHEV}</button><div class="lx-b"><div class="lx-in"><div class="lx-pad">${body}</div></div></div></div>`;
const spMini=x=>`<span class="sp-mini" style="background:${x.c}">${x.e?esc(x.e):esc((x.name[0]||'?').toUpperCase())}</span>`;
function lePanel(l,only,anim){
  const sp=spaceOf(l.space)||{name:'',c:'#888'},tg=ltags(l);
  return `<div class="le-coll${anim?' anim':''}" data-lec="${l.id}"><div class="le-panel">
    <div class="le-card">
      <label class="le-nm"><span class="le-cap">Name</span><input class="le-name" data-ren="${l.id}" value="${esc(l.name)}" maxlength="40" placeholder="List name" enterkeyhint="done" autocomplete="off" aria-label="List name">${PEN_S}</label>
      ${lxRow('c','Colour',`<i class="lx-dot" style="background:${l.c}"></i>`,`<div class="sw">${PALETTE.map(c=>`<button data-lc="${c}" class="${l.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>`,leSub==='c')}
      ${S.spaces.length>1?lxRow('s','Space',`${spMini(sp)}<span class="lx-t">${esc(sp.name)}</span>`,
        `<div class="lx-list">${S.spaces.map(x=>`<button class="lx-opt${l.space===x.id?' on':''}" data-ls="${x.id}" ${only&&l.space!==x.id?'disabled':''}>${spMini(x)}<span>${esc(x.name)}</span>${l.space===x.id?tick():''}</button>`).join('')}</div>${only?`<p class="le-note">It’s the only list in ${esc(sp.name)}, so it stays here.</p>`:''}`,leSub==='s'):''}
      ${lxRow('t','Tags',tg.length?`${tg.length} ${tg.length===1?'tag':'tags'}`:'None',`<div class="le-tags">${tg.map((n,i)=>`<span class="le-tg"><input data-tren="${i}" value="${esc(n)}" maxlength="24" size="${Math.max(2,n.length)}" aria-label="Tag name" autocomplete="off"><button data-tdel="${i}" aria-label="Remove tag">${X}</button></span>`).join('')}
          <input class="le-tg-new" id="leTagIn" maxlength="24" placeholder="+ Add tag" enterkeyhint="done" autocomplete="off"></div>`,leSub==='t')}
    </div>
    ${only?`<p class="le-note">The only list in ${esc(sp.name)} can’t be archived or deleted.</p>`:`<div class="le-acts"><button class="le-btn" data-larc="${l.id}">${ARC_S}Archive</button><button class="le-btn warn" data-ldel="${l.id}">${BIN_S}Delete</button></div>`}
  </div></div>`}
/* fold a section open or shut in place, without redrawing, so it glides */
function lxToggle(btn,setSub){
  const box=btn.closest('.lx'),was=box.classList.contains('on');
  box.parentNode.querySelectorAll(':scope>.lx.on').forEach(x=>{x.classList.remove('on');x.querySelector('.lx-h').setAttribute('aria-expanded','false')});
  if(!was){box.classList.add('on');btn.setAttribute('aria-expanded','true')}
  haptic(4);setSub(was?null:box.dataset.lx);
  if(!was&&box.dataset.lx==='t')setTimeout(()=>{const i=box.querySelector('#leTagIn');if(i&&!ltags(S.lists.find(x=>x.id===leOpen)||{}).length)i.focus()},280);
}
/* open or close a list's editor with a smooth slide; the old one folds away while the new one unfolds */
function leToggle(id){
  haptic(5);
  const pk=$('picks'),old=pk.querySelector('.le-coll:not(.closing)');
  if(old){old.classList.remove('anim');old.classList.add('closing');const r=old.previousElementSibling;if(r)r.classList.remove('open');setTimeout(()=>old.remove(),320)}
  if(leOpen===id){leOpen=null;leSub=null;return}
  leOpen=id;leSub=null;
  const row=pk.querySelector(`.le-row[data-le="${id}"]`),l=S.lists.find(x=>x.id===id);if(!row||!l){drawLists();return}
  row.classList.add('open');row.insertAdjacentHTML('afterend',lePanel(l,S.lists.filter(x=>x.space===l.space).length<2,true));
}
/* Settings → Lists shows the same list editor inside the settings page, grouped by space */
let listsInSet=false;
const picksHome={parent:null,next:null};
function listsToSettings(slot){const pk=$('picks');if(!picksHome.parent){picksHome.parent=pk.parentNode;picksHome.next=pk.nextSibling}slot.appendChild(pk);listsInSet=true;editing=true;nl=null;leOpen=null;pk.classList.add('editing','set-lists');drawLists()}
function listsBack(){const pk=$('picks');if(!listsInSet||!picksHome.parent)return;listsInSet=false;pk.classList.remove('editing','set-lists');picksHome.parent.insertBefore(pk,picksHome.next);editing=false;leOpen=null;nl=null}
function drawLists(){
  $('listSheetIn').classList.toggle('editing',editing);
  $('editLists').hidden=!editing||listsInSet;$('listsMore').parentNode.hidden=editing;$('listsPop').classList.remove('on');
  const LH=listsHere(),sp=inSpaceMode()?spaceOf(S.space):null;
  $('listsTitle').innerHTML=editing?`Edit lists${sp?`<small>${esc((sp.e?sp.e+' ':'')+sp.name)}</small>`:''}`:esc(sp?(sp.e?sp.e+' ':'')+sp.name:'Lists');$('editSpace').hidden=!sp||editing;
  const open=id=>S.tasks.filter(t=>shown(t)&&inSpace(t)&&(id==='all'||t.list===id)&&t.stage!=='done').length;
  let out='';
  if(!editing)out+=`<button class="pick" data-l="all"><span class="stack">${LH.slice(0,4).map(x=>`<span style="background:${x.c};border-color:var(--surface)"></span>`).join('')}</span>All lists<span class="n">${open('all')} open</span>${S.list==='all'?tick():''}</button>`;
  out+=LH.map(l=>editing
    ?(()=>{const n=S.tasks.filter(t=>t.list===l.id&&!t.archived).length,on=leOpen===l.id,only=S.lists.filter(x=>x.space===l.space).length<2;
      return `<button class="pick le-row ${on?'open':''}" data-l="${l.id}" data-le="${l.id}"><span class="dot" style="background:${l.c}"></span>${esc(l.name)}<span class="n">${n} ${n===1?'task':'tasks'}</span>${CHEV}</button>`+
      (on?lePanel(l,only):'')})()
    :`<button class="pick" data-l="${l.id}"><span class="dot" style="background:${l.c}"></span>${esc(l.name)}<span class="n">${open(l.id)} open</span>${S.list===l.id?tick():''}</button>`).join('');
  if(nl){
    out+=`<div class="nl-form"><input id="nlIn" placeholder="List name" enterkeyhint="done" autocomplete="off" value="${esc(nl.name)}">
      <div class="sw" id="nlSw">${PALETTE.map(c=>`<button data-c="${c}" class="${nl.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>
      <button class="primary" id="nlSave" style="background:${nl.c}" ${nl.name.trim()?'':'disabled'}>Create list</button></div>`;
  } else out+=`<button class="new-list" id="nlBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New list</button>`;
  if(listsInSet)out=listsGrouped();
  $('picks').innerHTML=out;
}
function listsGrouped(){
  return orderedSpaces().map(sp=>{const ls=S.lists.filter(l=>l.space===sp.id);
    return `<div class="lg" style="--sc:${sp.c}"><div class="lg-head"><span class="sp-mini">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><b>${esc(sp.name)}</b><span>${ls.length} ${ls.length===1?'list':'lists'}</span></div><div class="lg-card">`+
      ls.map(l=>{const n=S.tasks.filter(t=>t.list===l.id&&!t.archived).length,on=leOpen===l.id,only=ls.length<2;
        return `<button class="pick le-row ${on?'open':''}" data-l="${l.id}" data-le="${l.id}"><span class="dot" style="background:${l.c}"></span>${esc(l.name)}<span class="n">${n} ${n===1?'task':'tasks'}</span>${CHEV}</button>`+(on?lePanel(l,only):'')}).join('')+
      (nl&&nl.space===sp.id?`<div class="nl-form"><input id="nlIn" placeholder="List name in ${esc(sp.name)}" enterkeyhint="done" autocomplete="off" value="${esc(nl.name)}">
        <div class="sw" id="nlSw">${PALETTE.map(c=>`<button data-c="${c}" class="${nl.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>
        <button class="primary" id="nlSave" style="background:${nl.c}" ${nl.name.trim()?'':'disabled'}>Create list</button></div>`
       :`<button class="new-list lg-new" data-nlsp="${sp.id}">${PLUS_S}New list in ${esc(sp.name)}</button>`)+`</div></div>`}).join('');
}
const tick=()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
$('listBtn').onclick=()=>{editing=false;nl=null;drawLists();openSheet('listSheet')};
$('editLists').onclick=()=>{editing=false;nl=null;leOpen=null;drawLists()};
/* ⋯ in the Lists sheet header: Edit lists, and Edit space when inside a space */
$('listsMore').onclick=e=>{e.stopPropagation();const p=$('listsPop'),was=p.classList.contains('on');document.querySelectorAll('.sp-pop.on').forEach(x=>x.classList.remove('on'));if(!was){haptic(5);p.classList.add('on')}};
$('lmEdit').onclick=()=>{editing=true;nl=null;leOpen=null;drawLists()};
$('picks').addEventListener('click',e=>{
  const lt=e.target.closest('[data-lxt]');if(lt){lxToggle(lt,v=>leSub=v);return}
  const nb=e.target.closest('#nlBtn,[data-nlsp]');if(nb){nl={name:'',c:PALETTE[S.lists.length%PALETTE.length],space:nb.dataset.nlsp||null};drawLists();try{$('nlIn').focus()}catch(_){}setTimeout(()=>$('nlIn')&&$('nlIn').focus(),50);return}
  const sw=e.target.closest('#nlSw button');if(sw){nl.c=sw.dataset.c;drawLists();return}
  if(e.target.closest('#nlSave'))return createList();
  const lc=e.target.closest('[data-lc]');if(lc){const l=S.lists.find(x=>x.id===leOpen);if(l){l.c=lc.dataset.lc;haptic(5);drawLists();render()}return}
  const ls=e.target.closest('[data-ls]');if(ls&&!ls.disabled){const l=S.lists.find(x=>x.id===leOpen);if(l&&l.space!==ls.dataset.ls){
    const nx=spaceOf(ls.dataset.ls);l.space=nx.id;if(inSpaceMode()&&S.list===l.id)S.list='all';leOpen=inSpaceMode()?null:l.id;haptic(6);drawLists();render();toast(`${l.name} moved to ${nx.name}`)}return}
  const td=e.target.closest('[data-tdel]');if(td){const l=S.lists.find(x=>x.id===leOpen);if(!l)return;const name=ltags(l)[+td.dataset.tdel];if(name==null)return;
    const used=S.tasks.filter(t=>t.list===l.id&&tagsOf(t).some(x=>tagKey(x)===tagKey(name)));
    const go=()=>{commit(()=>{l.tags=ltags(l).filter(x=>x!==name);used.forEach(t=>t.tags=tagsOf(t).filter(x=>tagKey(x)!==tagKey(name)))},`#${name} removed`);drawLists()};
    if(!used.length){go();return}
    confirmAsk({title:`Remove #${name}?`,text:`It comes off ${used.length} ${used.length===1?'task':'tasks'}. The tasks stay.`,yes:'Yes, remove',no:'No',onYes:go});return}
  const la=e.target.closest('[data-larc]');if(la){const l=S.lists.find(x=>x.id===la.dataset.larc);if(!l)return;
    commit(()=>archiveList(l),`${l.name} archived`);leOpen=null;leSub=null;drawLists();return}
  const ld=e.target.closest('[data-ldel]');if(ld){const l=S.lists.find(x=>x.id===ld.dataset.ldel);if(!l)return;
    const n=S.tasks.filter(t=>t.list===l.id).length;
    confirmDanger({title:`Delete ${l.name}?`,text:`This deletes the list and its ${n} ${n===1?'task':'tasks'} for good. To keep them safe, choose Archive list instead.`,word:l.name,yes:'Delete list',
      onYes:()=>{commit(()=>{S.lists=S.lists.filter(x=>x!==l);S.tasks=S.tasks.filter(t=>t.list!==l.id);if(S.list===l.id)S.list='all'},`${l.name} deleted`);leOpen=null;drawLists()}});return}
  const p=e.target.closest('.pick');if(!p)return;const id=p.dataset.l;
  if(editing){
    const l=S.lists.find(x=>x.id===id);
    if(e.target.closest('[data-le]')){leToggle(id);return}
    if(e.target.closest('[data-mv]')){const i=S.spaces.findIndex(x=>x.id===l.space),nx=S.spaces[(i+1)%S.spaces.length];
      if(S.lists.filter(x=>x.space===l.space).length<2)return toast('A space needs at least one list');
      l.space=nx.id;if(inSpaceMode()&&S.list===l.id)S.list='all';haptic(6);drawLists();render();return toast(`${l.name} moved to ${nx.name}`)}
    if(e.target.closest('[data-recolor]')){l.c=PALETTE[(PALETTE.indexOf(l.c)+1)%PALETTE.length];haptic(5);drawLists();render();return}
    if(e.target.closest('[data-dl]')){
      const n=S.tasks.filter(t=>t.list===id).length;
      commit(()=>{S.lists=S.lists.filter(x=>x!==l);S.tasks=S.tasks.filter(t=>t.list!==id);if(S.list===id)S.list='all'},
        n?`List and ${n} ${n===1?'task':'tasks'} deleted`:'List deleted');
      drawLists();
    }
    return;
  }
  S.list=id;closeSheets();render(0);
});
$('picks').addEventListener('input',e=>{if(e.target.dataset.ren){const l=S.lists.find(x=>x.id===e.target.dataset.ren);if(l&&e.target.value.trim()){l.name=e.target.value.trim();const row=document.querySelector(`.le-row[data-le="${l.id}"]`);if(row&&row.childNodes[1])row.childNodes[1].textContent=l.name;save()}return}if(e.target.id==='nlIn'){nl.name=e.target.value;$('nlSave').disabled=!nl.name.trim()}});
function renameTag(inp){const l=S.lists.find(x=>x.id===leOpen);if(!l)return;const i=+inp.dataset.tren,old=ltags(l)[i],n=tagClean(inp.value);
  if(old==null||!n||n===old){inp.value=old||'';return}
  if(ltags(l).some((x,j)=>j!==i&&tagKey(x)===tagKey(n))){inp.value=old;return toast('That tag already exists')}
  l.tags[i]=n;S.tasks.forEach(t=>{if(t.list===l.id&&tagsOf(t).length)t.tags=tagsOf(t).map(x=>tagKey(x)===tagKey(old)?n:x)});save();render();drawLists()}
$('picks').addEventListener('focusout',e=>{if(e.target.dataset&&e.target.dataset.tren!=null)renameTag(e.target)});
$('picks').addEventListener('keydown',e=>{
  if(e.target.dataset.tren!=null&&e.key==='Enter'){e.preventDefault();e.target.blur();return}
  if(e.target.id==='leTagIn'&&e.key==='Enter'){e.preventDefault();const l=S.lists.find(x=>x.id===leOpen);if(l&&addListTag(l,e.target.value)){haptic(6);save();drawLists();setTimeout(()=>$('leTagIn')&&$('leTagIn').focus(),0)}return}
if(e.target.dataset.ren&&e.key==='Enter'){e.target.blur();leToggle(leOpen);render();return}if(e.target.id==='nlIn'&&e.key==='Enter')createList()});
function createList(){
  if(!nl||!nl.name.trim())return;
  const l={id:'l'+newId(),name:nl.name.trim(),c:nl.c,space:nl.space||(inSpaceMode()?S.space:S.spaces[0].id)};S.lists.push(l);nl=null;haptic(8);
  if(listsInSet){save();render();drawLists();toast(`${l.name} created`);return}
  S.list=l.id;closeSheets();render(0);toast(`${l.name} created`);
}

/* daily reset */
function checkNewDay(){
  runCleanup(false);
  const d=today();if(S.lastDay===d)return;
  S.lastDay=d;
  const left=S.tasks.filter(t=>t.stage==='today'&&shown(t)&&!(t.showFrom===d));
  render();
  if(!left.length||anyOpen()||!S.cfg.checkin)return;
  $('resetTxt').textContent=`${left.length} ${left.length===1?'task':'tasks'} left over from yesterday. Keep ${left.length===1?'it':'them'} for today?`;
  openSheet('resetSheet');
  $('keepBtn').onclick=()=>{closeSheets();haptic(6)};
  $('weekBtn').onclick=()=>{closeSheets();commit(()=>left.forEach(t=>t.stage='week'),`Moved ${left.length} to ${STAGES[1].name}`)};
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkNewDay();if(F.on){if(F.tide)tideTick();else step();if(S.cfg.wake)lockScreen()}}});


