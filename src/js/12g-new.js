/* ---------- Lists without a space + one "+ New" for everything (0.275) ----------
   A list can live on its own (l.loose=true, l.space=''). It shows in a "Lists" group: the computer sidebar
   (above Spaces), the phone Home (above Spaces) and the computer Home chips. Opening one shows its board
   (it uses the "All tasks" board, narrowed to that list).
   "+ New": on computers a round + floats at the bottom right of Home; on phones a tap on the big + (0.278).
   Both open a small menu: Task, Note (only when the Inbox is on), List, Space (+ Habit and Goal when those
   modes are on). Each opens the add card, where tabs switch between them. Keys: T, N, L, S, H, G. */
const isLooseView=()=>S.space==='all'&&S.list!=='all'&&!!(S.lists.find(l=>l.id===S.list)||{}).loose;
const nwOpenN=id=>S.tasks.filter(t=>shown(t)&&t.list===id&&t.stage!=='done').length;
function nwPagesShut(){
  if(typeof ibOn!=='undefined'&&ibOn)closeInbox();if(typeof rhOn!=='undefined'&&rhOn)closeRhythm();
  if(typeof glOn!=='undefined'&&glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal()}
function openLoose(id){if(!S.lists.some(l=>l.id===id&&l.loose))return;nwPagesShut();try{spPage=null;fwPeek=null}catch(e){}
  S.subHidden=true;openSpace('all');S.list=id;render()}
function openListEditor(id){if(inSpaceMode())openLoose(id);editing=true;nl=null;leOpen=id;leSub=null;drawLists();openSheet('listSheet')}

/* computer sidebar, computer Home chips, the board title */
const NW_DOTS='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
function looseDesk(){
  const lo=looseLists(),sl=$('sLists');if(!sl)return;
  const pageOn=(typeof ibOn!=='undefined'&&ibOn)||(typeof rhOn!=='undefined'&&rhOn)||(typeof glOn!=='undefined'&&glOn);
  if(lo.length&&!sl.querySelector('.s-loose-g')){
    const h=`<div class="s-lbl2 s-loose-g"><span class="s-name">Lists</span></div>`+lo.map(l=>`<button class="s-list s-sp s-loose s-loose-g ${isLooseView()&&S.list===l.id&&!pageOn?'on':''}" data-loose="${l.id}" title="${esc(l.name)}"><i class="sp-sq lo-sq" style="background:${l.c}"></i><span class="s-name">${esc(l.name)}</span><span class="n">${nwOpenN(l.id)}</span><span class="s-more" data-looseedit="${l.id}" role="button" aria-label="Edit ${esc(l.name)}" title="Edit list">${NW_DOTS}</span></button>`).join('');
    const lab=[...sl.querySelectorAll('.s-lbl2')].find(x=>!x.classList.contains('s-loose-g'));lab?lab.insertAdjacentHTML('beforebegin',h):sl.insertAdjacentHTML('beforeend',h)}
  if(isLooseView()){const a=$('sAll');if(a){a.classList.remove('on','folded');const n=a.nextElementSibling;if(n&&n.classList.contains('s-sub'))n.remove()}
    const l=listOf(S.list);if($('mDate'))$('mDate').textContent=l.name}
  const chip=(l,cls)=>cls==='cm'?`<button class="cm-sp cm-lo" data-loose="${l.id}"><b><i class="lo-dot" style="background:${l.c}"></i>${esc(l.name)}</b><small>${nwOpenN(l.id)} open</small></button>`
    :`<button class="bn-sp bn-lo" data-loose="${l.id}"><span class="bn-spi"><i style="background:${l.c};border-radius:50%"></i></span><b>${esc(l.name)}</b><small>${nwOpenN(l.id)} open</small></button>`;
  if(lo.length){const cm=document.querySelector('#dHome .cm-sps');if(cm&&!cm.querySelector('.cm-lo')){const nw=cm.querySelector('.cm-sp.new');const h=lo.map(l=>chip(l,'cm')).join('');nw?nw.insertAdjacentHTML('beforebegin',h):cm.insertAdjacentHTML('beforeend',h)}
    const bn=document.querySelector('#dHome .bn-sps');if(bn&&!bn.querySelector('.bn-lo')){const nw=bn.querySelector('.bn-sp.new');const h=lo.map(l=>chip(l,'bn')).join('');nw?nw.insertAdjacentHTML('beforebegin',h):bn.insertAdjacentHTML('beforeend',h)}}
}
const _nwRender=render;
render=function(){const r=_nwRender.apply(this,arguments);try{looseDesk();nwFabPaint()}catch(e){}return r};
const _nwFw=renderFullWidth;
renderFullWidth=function(){_nwFw.apply(this,arguments);if(!isLooseView())return;const p=document.querySelector('#fwNav .fw-pill');if(p)p.innerHTML=`<span>${esc(listOf(S.list).name)}</span>${CHEV_D}`};

/* phone Home: a "Lists" card above Spaces */
const _nwHome=homeSpaces;
homeSpaces=function(){const lo=looseLists(),rest=_nwHome.apply(this,arguments);if(!lo.length)return rest;
  return `<h2 class="sec-h">Lists</h2><div class="sp-grid lo-grid">${lo.map(l=>{const ts=S.tasks.filter(t=>shown(t)&&t.list===l.id),td=ts.filter(t=>t.stage==='today').length,op=ts.filter(t=>t.stage!=='done').length;
    const sub=td||op?[td?`<b>${td}</b> today`:'',op?`${op} open`:''].filter(Boolean).join(' · '):'Nothing open';
    return `<div class="sp-card sp-row lo-row" role="button" tabindex="0" data-loose="${l.id}" style="--sc:${l.c}"><span class="sp-ico lo-ico"><i style="background:${l.c}"></i></span>
      <span class="sp-rt"><span class="sp-name">${esc(l.name)}</span><span class="sp-sub">${sub}</span></span><button class="sp-more" data-looseedit="${l.id}" aria-label="List options">${NW_DOTS}</button></div>`}).join('')}</div>`+rest};

document.addEventListener('click',e=>{
  const ed=e.target.closest('[data-looseedit]');if(ed){e.preventDefault();e.stopPropagation();haptic(5);return openListEditor(ed.dataset.looseedit)}
  const b=e.target.closest('[data-loose]');if(b){e.preventDefault();e.stopPropagation();haptic(5);return openLoose(b.dataset.loose)}
  if(isLooseView()&&e.target.closest('#sAll')){e.preventDefault();e.stopPropagation();S.list='all';S.subHidden=false;haptic(5);render()}
},true);
document.addEventListener('keydown',e=>{const r=e.target.closest&&e.target.closest('.lo-row[data-loose]');if(r&&e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();openLoose(r.dataset.loose)}},true);

/* ---------- the add card learns List and Space ---------- */
AK_IC.list='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="17" r="1.2" fill="currentColor"/></svg>';
AK_IC.space='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
const _nwKinds=addKinds;
addKinds=function(){const k=_nwKinds.apply(this,arguments),i=k.findIndex(x=>x[0]==='note');k.splice(i>=0?i+1:1,0,['list','List'],['space','Space']);return k};
let nwL={c:PALETTE[0],space:''},nwS={e:'',touched:false,c:PALETTE[1],bring:[]};
const nwSw=(cur,attr)=>`<div class="sw nw-sw">${PALETTE.map(c=>`<button data-${attr}="${c}" class="${cur===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>`;
const _nwKindsDraw=drawKinds;
drawKinds=function(){_nwKindsDraw.apply(this,arguments);
  if(addKind!=='list'&&addKind!=='space')return;
  const t=$('newTitle'),x=$('addExtra'),sb=$('saveBtn'),v=t.value.trim();x.hidden=false;
  if(addKind==='list'){t.placeholder='List name, e.g. Groceries';sb.textContent='Add list';
    x.innerHTML=`<div class="lbl">Colour</div>${nwSw(nwL.c,'nwc')}
      <div class="lbl">Put it in</div><div class="opts row-scroll"><button class="opt${!nwL.space?' on':''}" data-nwls="">No space</button>${orderedSpaces().map(sp=>`<button class="opt sp-opt${nwL.space===sp.id?' on':''}" data-nwls="${sp.id}"><span class="sp-mini" style="background:${sp.c}">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span>${esc(sp.name)}</button>`).join('')}</div>`;
    sb.style.background='var(--today)';sb.style.color=''}
  else{t.placeholder='Space name, e.g. Music';sb.textContent='Create space';if(!nwS.touched)nwS.e=autoIcon(v);
    const lo=looseLists();
    x.innerHTML=`<div class="lbl">Icon</div><div class="opts row-scroll nw-ico"><button class="opt${!nwS.e?' on':''}" data-nwi="" aria-label="No icon">${esc((v[0]||'A').toUpperCase())}</button>${ICONS.map(i=>`<button class="opt${nwS.e===i?' on':''}" data-nwi="${i}" aria-label="Icon ${i}">${i}</button>`).join('')}</div>
      <div class="lbl">Colour</div>${nwSw(nwS.c,'nwsc')}
      ${lo.length?`<div class="lbl">Bring lists in <span class="ak-opt">Optional</span></div><div class="opts row-scroll">${lo.map(l=>`<button class="opt${nwS.bring.includes(l.id)?' on':''}" data-nwbr="${l.id}"><i style="background:${l.c}"></i>${esc(l.name)}</button>`).join('')}</div>`:''}`;
    sb.style.background='var(--backlog)';sb.style.color='#fff'}
  sb.disabled=!v};
$('addExtra').addEventListener('click',e=>{
  const c=e.target.closest('[data-nwc]');if(c){nwL.c=c.dataset.nwc;haptic(4);return drawKinds()}
  const s=e.target.closest('[data-nwls]');if(s){nwL.space=s.dataset.nwls;haptic(4);return drawKinds()}
  const i=e.target.closest('[data-nwi]');if(i){nwS.e=i.dataset.nwi;nwS.touched=true;haptic(4);return drawKinds()}
  const sc=e.target.closest('[data-nwsc]');if(sc){nwS.c=sc.dataset.nwsc;haptic(4);return drawKinds()}
  const br=e.target.closest('[data-nwbr]');if(br){const id=br.dataset.nwbr;nwS.bring=nwS.bring.includes(id)?nwS.bring.filter(x=>x!==id):[...nwS.bring,id];haptic(4);return drawKinds()}
});
const _nwOpen=$('addBtn').onclick;
$('addBtn').onclick=e=>{nwL={c:PALETTE[S.lists.length%PALETTE.length],space:inSpaceMode()?S.space:''};nwS={e:'',touched:false,c:PALETTE[(S.spaces.length+3)%PALETTE.length],bring:[]};return _nwOpen(e)};
const _nwSave=$('saveBtn').onclick;
$('saveBtn').onclick=()=>{
  if(addKind!=='list'&&addKind!=='space')return _nwSave();
  const name=$('newTitle').value.trim();if(!name)return;closeSheets();
  if(addKind==='list'){const sp=nwL.space&&spaceOf(nwL.space)?nwL.space:'';
    const l=sp?{id:'l'+newId(),name,c:nwL.c,space:sp}:{id:'l'+newId(),name,c:nwL.c,space:'',loose:true};
    commit(()=>S.lists.push(l),`${name} created`);try{sfx('add')}catch(e){}
    nwPagesShut();if(l.loose)openLoose(l.id);else{openSpaceSide(sp);S.list=l.id;render()}return}
  const sp={id:'s'+newId(),name,c:nwS.c,e:nwS.e,autoSet:true};
  commit(()=>{S.spaces.push(sp);const br=S.lists.filter(l=>l.loose&&nwS.bring.includes(l.id));br.forEach(l=>{l.space=sp.id;l.loose=false});
    if(!br.length)S.lists.push({id:'l'+newId(),name:'General',c:sp.c,space:sp.id})},`${name} created`);try{sfx('add')}catch(e){}
  nwPagesShut();openSpaceSide(sp.id)};

/* ---------- the + menu: computer floating button, phone long press ---------- */
const NW_COL={task:'var(--today)',note:'var(--week)',list:'#5AB8F5',space:'var(--backlog)',habit:'var(--done)',goal:'#F5A35A'};
const NW_KEY={task:'T',note:'N',list:'L',space:'S',habit:'H',goal:'G'};
document.body.insertAdjacentHTML('beforeend',`<div class="nw-scrim" id="nwScrim"></div><div class="nw-menu" id="nwMenu" role="menu" aria-label="Add new"></div>
  <button class="nw-x" id="nwX" aria-label="Close" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
  <button class="nw-fab" id="nwFab" aria-label="Add new" aria-haspopup="menu" aria-expanded="false" title="Add new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`);
var nwOn=false,nwFromFab=false;
function nwFabPaint(){const f=$('nwFab');if(!f)return;const sheet=$('addSheet').classList.contains('on')&&$('addSheet').classList.contains('nw-fab-on');
  f.classList.toggle('open',nwOn||sheet);f.setAttribute('aria-expanded',String(nwOn))}
function openNw(anchor){
  const ks=addKinds();if(!ks.length)return;nwOn=true;
  const m=$('nwMenu');m.innerHTML=[...ks].reverse().map(([k,l])=>`<button role="menuitem" data-nwk="${k}"><span class="nw-l">${esc(l)}<kbd>${NW_KEY[k]||''}</kbd></span><span class="nw-i" style="--nc:${NW_COL[k]||'var(--text)'}">${AK_IC[k]||''}</span></button>`).join('');
  const r=anchor.getBoundingClientRect();m.style.right=Math.max(12,innerWidth-r.right)+'px';m.style.bottom=(innerHeight-r.top+14)+'px';
  m.style.setProperty('--iw',Math.min(r.width,56)+'px');
  m.classList.add('on');$('nwScrim').classList.add('on');const x=$('nwX');if(!nwFromFab){Object.assign(x.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});x.classList.add('on')}haptic([6,30,6]);try{sfx('fold')}catch(e){}nwFabPaint();
  if(matchMedia('(min-width:1100px)').matches)setTimeout(()=>{const b=m.querySelector('[data-nwk="task"]');if(b)b.focus({preventScroll:true})},60)}
function closeNw(){if(!nwOn)return;nwOn=false;$('nwMenu').classList.remove('on');$('nwX').classList.remove('on');$('nwScrim').classList.remove('on');nwFabPaint()}
function nwPick(k){const fab=nwFromFab&&matchMedia('(min-width:1100px)').matches;closeNw();
  const sh=$('addSheet');sh.classList.toggle('nw-fab-on',fab);void sh.offsetWidth;addKindNext=k;$('addBtn').click();nwFabPaint()}
$('nwFab').addEventListener('click',e=>{e.stopPropagation();
  if($('addSheet').classList.contains('on')){closeSheets();return}
  if(nwOn)return closeNw();nwFromFab=true;openNw($('nwFab'))});
$('nwScrim').addEventListener('click',closeNw);$('nwX').addEventListener('click',e=>{e.stopPropagation();closeNw()});
$('nwMenu').addEventListener('click',e=>{const b=e.target.closest('[data-nwk]');if(b){e.stopPropagation();nwPick(b.dataset.nwk)}});
document.addEventListener('keydown',e=>{if(!nwOn)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return closeNw()}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=Object.keys(NW_KEY).find(x=>NW_KEY[x]===e.key.toUpperCase());
  if(k&&addKinds().some(x=>x[0]===k)){e.preventDefault();e.stopImmediatePropagation();nwPick(k)}},true);
const _nwShut=closeSheets;
closeSheets=function(){const r=_nwShut.apply(this,arguments);setTimeout(()=>{if(!$('addSheet').classList.contains('on'))$('addSheet').classList.remove('nw-fab-on');nwFabPaint()},380);nwFabPaint();return r};
/* phones (0.278): a tap on the + opens the same menu as the computer's floating +.
   Pages with their own kind keep their direct add: Habits (+ habit), Goals (+ goal), and Wins / Routines / Journal (their own handlers run first).
   Code that "clicks" the + itself (N key, "Add a task" buttons, a menu pick) still opens the task card straight away. */
document.addEventListener('click',e=>{const b=e.target.closest('#addBtn,#tbAdd');if(!b||!e.isTrusted)return;
  if((typeof rhOn!=='undefined'&&rhOn)||(typeof glOn!=='undefined'&&glOn&&!(typeof gdOn!=='undefined'&&gdOn)))return;
  e.preventDefault();e.stopImmediatePropagation();if(nwOn)return closeNw();nwFromFab=false;openNw(b)},true);
nwFabPaint();
