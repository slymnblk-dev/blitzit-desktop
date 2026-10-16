/* ---------- recurring ---------- */
function nextDate(rep){
  let d=new Date();d.setHours(12,0,0,0);
  if(rep==='weekly')return dkey(d.getTime()+7*DAY);
  do{d=new Date(d.getTime()+DAY)}while(rep==='weekdays'&&(d.getDay()===0||d.getDay()===6));
  return dkey(d);
}
/* priority order (optional, on by default): High, then Medium, then Low, then the rest; your own order stays within each level */
const priSortOn=()=>!S.cfg||S.cfg.priSort!==false;
const priRank=t=>({high:0,med:1,low:2})[t&&t.pri]??3;
const priSorted=list=>priSortOn()?[...list].sort((a,b)=>priRank(a)-priRank(b)):list;
/* after a drag: did the person drop the task where priority order won't let it stay? */
function priBreaks(t,prev,next){return priSortOn()&&((prev&&priRank(prev)>priRank(t))||(next&&priRank(next)<priRank(t)))}
let priHintAt=0;
function priHint(t){if(Date.now()-priHintAt<1500)return;priHintAt=Date.now();
  toast('Sorted by priority. To move this task, change its priority.')}
function setStage(t,stage){
  const was=t.stage;t.stage=stage;
  sfxStage(t,was,stage);
  if(stage==='done'&&was!=='done'&&performance.now()-sfxAct<1500)setTimeout(()=>{try{maybeCelebrate()}catch(e){}},360);
  if(stage==='done'&&was!=='done'){
    t.doneAt=Date.now();
    if(t.repeat!=='none'&&!t.spawned){
      const c={id:newId(),title:t.title,stage:'today',list:t.list,est:t.est,notes:t.notes,repeat:t.repeat,...(t.pri?{pri:t.pri}:{}),
        subs:t.subs.map(s=>({...s,done:false})),showFrom:nextDate(t.repeat)};
      S.tasks.push(c);t.spawned=c.id;
    }
  }
  if(was==='done'&&stage!=='done'){
    delete t.doneAt;
    if(t.spawned){const c=S.tasks.find(x=>x.id===t.spawned);if(c&&!shown(c))S.tasks=S.tasks.filter(x=>x!==c);delete t.spawned}
  }
}

/* ---------- streak ---------- */
function doneDays(){const s=new Set();S.tasks.forEach(t=>t.doneAt&&s.add(dkey(t.doneAt)));return s}
function streak(){
  const s=doneDays();let n=0,d=Date.now();
  if(!s.has(dkey(d)))d-=DAY;
  while(s.has(dkey(d))){n++;d-=DAY}
  return n;
}

/* ---------- render ---------- */
let enterId=null, prevCounts={};

function dayLabel(ts){
  const k=dkey(ts);
  if(k===today())return 'Today';
  if(k===dkey(Date.now()-DAY))return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
}
/* fold long columns (optional): first N tasks, the rest behind a quiet "N more" row */
const moreOpen={};
function foldRows(list,key){
  const n=+S.cfg.collapseAt||5;
  if(!S.cfg.collapseLong||list.length<=n)return list.map(rowHTML).join('');
  const open=!!moreOpen[key];
  const btn=`<li class="more-row"><button class="more-btn ${open?'open':''}" data-more="${key}"><span>${open?'Show less':`${list.length-n} more`}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button></li>`;
  return (open?list:list.slice(0,n)).map(rowHTML).join('')+btn;
}
/* priority (optional, set in task details): High / Medium / Low, shown as small signal bars */
const PRIS=[{id:'high',name:'High',n:3},{id:'med',name:'Medium',n:2},{id:'low',name:'Low',n:1}];
const priOf=t=>PRIS.find(p=>p.id===t.pri)||null;
const priIcon=n=>`<svg class="pri-i" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="9.5" width="3" height="4.5" rx="1" ${n>=1?'':'class="off"'}/><rect x="6.5" y="6" width="3" height="8" rx="1" ${n>=2?'':'class="off"'}/><rect x="11" y="2" width="3" height="12" rx="1" ${n>=3?'':'class="off"'}/></svg>`;
function rowHTML(t){
  const l=listOf(t.list);
  const sd=t.subs.filter(s=>s.done).length;
  const pr=t.stage!=='done'?priOf(t):null,ps=S.cfg.priStyle||'bars';
  const extra=[
    pr&&ps==='bars'?`<span class="mi pri ${pr.id}" title="${pr.name} priority">${priIcon(pr.n)}${pr.name}</span>`:'',
    tagChips(t,3),
    t.repeat!=='none'?`<span class="mi">${I_REP}${REPEATS.find(r=>r.id===t.repeat).name}</span>`:'',
    t.subs.length?`<span class="mi">${I_SUB}${sd}/${t.subs.length}</span>`:'',
    t.notes.trim()?`<span class="mi" aria-label="Has notes">${I_NOTE}</span>`:''
  ].join('');
  return `<li class="row ${t.stage==='done'?'is-done':''} ${t.id===enterId?'enter':''} ${pr&&ps==='ring'?'pr-'+pr.id:''} ${pr&&ps==='edge'?'pe-'+pr.id:''} ${pr&&ps==='tint'?'pt-'+pr.id:''}" data-id="${t.id}">
    <div class="under"><span></span></div>
    <div class="row-in">
      <button class="check" data-check aria-label="Complete">${CHECK}</button>
      <div class="body"><div class="title"><span>${esc(t.title)}</span>${pr&&(ps==='dot'||ps==='marks')?`<i class="pri-mk ${pr.id}" title="${pr.name} priority" aria-label="${pr.name} priority">${'!'.repeat(pr.n)}</i>`:''}</div>
        ${(S.list==='all'||extra)?`<div class="meta">${S.list==='all'?`<span class="tag"><i style="background:${l.c}"></i>${esc(l.name)}</span>`:''}${extra}</div>`:''}</div>
      <div class="est">${fmt(t.est)}</div>
    </div></li>`;
}

function spaceStats(sp){
  const ls=S.lists.filter(l=>l.space===sp.id).map(l=>l.id),ts=S.tasks.filter(t=>shown(t)&&ls.includes(t.list));
  const by={};VS().forEach(st=>by[st.id]=ts.filter(t=>t.stage===st.id).length);
  return {lists:ls.length,by,total:Object.values(by).reduce((a,b)=>a+b,0),today:by.today||0,open:(by.backlog||0)+(by.week||0)+(by.today||0)};
}
/* pinned spaces come first; otherwise keep your own order */
const orderedSpaces=()=>[...S.spaces.filter(x=>x.pinned),...S.spaces.filter(x=>!x.pinned)];
const PIN_I='<svg class="pin-i" viewBox="0 0 24 24" fill="currentColor" aria-label="Pinned"><path d="M15.5 3.5l5 5-2.2.9-3.6 3.6.4 4.2-1.6 1.6-3.7-3.7-4.6 4.6-1.1-1.1 4.6-4.6-3.7-3.7L6.6 9.3l4.2.4 3.6-3.6z"/></svg>';
function togglePin(id){
  const sp=spaceOf(id);if(!sp)return;const on=!sp.pinned;
  commit(()=>{sp.pinned=on},on?`${sp.name} pinned to top`:`${sp.name} unpinned`);haptic(on?[8,40,8]:6);
}
const DOTS3='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
function spaceRows(){
  return orderedSpaces().map(sp=>{const st=spaceStats(sp);
    const sub=st.today||st.open?[st.today?`<b>${st.today}</b> today`:'',st.open?`${st.open} open`:''].filter(Boolean).join(' · '):'Nothing open';
    return `<div class="sp-card sp-row" role="button" tabindex="0" data-space="${sp.id}" style="--sc:${sp.c}">
      <span class="sp-ico">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span>
      <span class="sp-rt"><span class="sp-name">${esc(sp.name)}${sp.pinned?PIN_I:''}</span><span class="sp-sub">${sub}</span></span>
      <button class="sp-more" data-more="${sp.id}" aria-label="Space options">${DOTS3}</button>
      <div class="sp-pop" data-pop="${sp.id}"><button data-pin="${sp.id}">${sp.pinned?'Unpin':'Pin to top'}</button><button data-edit="${sp.id}">Edit space</button>${S.spaces.length>1?`<button data-sparc="${sp.id}">Archive</button>`:''}<button class="warn" data-del="${sp.id}">Delete space</button></div>
    </div>`}).join('')+`<button class="sp-new sp-row-new" id="spNew">${PLUS_S}<span>New space</span></button>`;
}
function spaceCards(){
  if((S.cfg.homeStyle||'calm')==='calm')return spaceRows();
  return orderedSpaces().map(sp=>{const st=spaceStats(sp);
    return `<div class="sp-card" role="button" tabindex="0" data-space="${sp.id}" style="--sc:${sp.c}">
      <div class="sp-top"><span class="sp-ico">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><span class="sp-name">${esc(sp.name)}${sp.pinned?PIN_I:''}</span>
        <button class="sp-more" data-more="${sp.id}" aria-label="Space options"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button></div>
      <div class="sp-pop" data-pop="${sp.id}"><button data-pin="${sp.id}">${sp.pinned?'Unpin':'Pin to top'}</button><button data-edit="${sp.id}">Edit space</button>${S.spaces.length>1?`<button data-sparc="${sp.id}">Archive</button>`:''}<button class="warn" data-del="${sp.id}">Delete space</button></div>
      <div class="sp-bar">${st.total?VS().map(x=>st.by[x.id]?`<span style="flex:${st.by[x.id]};background:var(--${x.id})"></span>`:'').join(''):''}</div>
      <div class="sp-meta"><span><b>${st.today}</b> today</span><span><b>${st.open}</b> open</span><span>${st.lists} ${st.lists===1?'list':'lists'}</span></div>
    </div>`}).join('')+`<button class="sp-new" id="spNew">${PLUS_S}<span>New space</span></button>`;
}
/* Today's tasks ordered like the space list: pinned spaces first, then the rest top to bottom */
function bySpaceOrder(ts){
  const rank=new Map(orderedSpaces().map((sp,i)=>[sp.id,i]));
  return ts.map((t,i)=>({t,i,r:rank.has(listOf(t.list).space)?rank.get(listOf(t.list).space):999})).sort((a,b)=>a.r-b.r||a.i-b.i).map(x=>x.t);
}
/* the Home card is about one space: pinned first, otherwise the first space (top to bottom) with tasks in Today */
function focusSpace(td){const sp=orderedSpaces().find(x=>td.some(t=>listOf(t.list).space===x.id));return sp||null}
function todayCard(td,m){
  if(!S.tasks.length)return `<div class="td-card td-empty"><span class="td-lbl">Today</span><p>Tap <b>+</b> to add your first task.</p></div>`;
  if(!td.length)return `<button class="td-card td-empty" id="tdOpen"><span class="td-lbl">Today</span><p>Nothing planned yet. Pick something from your week.</p><span class="td-link">Plan today${CHEV}</span></button>`;
  const sp=focusSpace(td),mine=sp?td.filter(t=>listOf(t.list).space===sp.id):td,nx=mine[0];
  return `<div class="td-card" id="tdOpen" data-sp="${sp?sp.id:''}" role="button" tabindex="0">
    <div class="td-head"><span class="td-lbl">Today</span></div>
    ${sp?`<span class="td-space">${sp.e?`<i>${esc(sp.e)}</i>`:''}${esc(sp.name)}</span>`:''}
    <div class="td-next"><span class="td-up">Up next</span><span class="td-title">${esc(nx.title)}</span>${mine.length>1?`<span class="td-more">+${mine.length-1} more</span>`:''}</div>
    <button class="td-go" id="tdBlitz" aria-label="Focus: start on today's tasks"><span class="td-ring"></span><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg><span class="td-gl">Focus</span></button>
  </div>`;
}
function homeHTML(){
  const all=S.tasks.filter(shown),td=bySpaceOrder(all.filter(t=>t.stage==='today')),m=td.reduce((a,t)=>a+t.est,0);
  return `<section class="home-hero"><div class="home-date">${meName()?esc(greeting())+' · ':''}${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</div>
    <h1>Home</h1>
    <div class="summary d-only">${td.length?`<span><b>${td.length}</b> ${td.length===1?'task':'tasks'} today</span><span><b>${fmt(m)}</b> planned</span>`:(S.tasks.length?'<span>Nothing planned for today</span>':'<span>Tap <b>+</b> to add your first task</span>')}</div>
    <button class="all-link d-only" id="allTasks">See all tasks${CHEV}</button></section>
    ${todayCard(td,m)}${backupCard()}<div class="sp-grid">${spaceCards()}</div>`;
}
function render(dir){
  root.dataset.view=S.space?'space':'home';drawMe();
  if(!S.space){
    root.style.setProperty('--accent',color('today'));
    $('homeView').innerHTML=homeHTML();
    if(typeof renderDesk==='function')renderDesk();
    enterId=null;save();return;
  }
  const st=STAGES[idx(S.stage)];
  root.style.setProperty('--accent',color(S.stage));
  const h=$('stageTitle');h.textContent=st.name;
  if(dir!==undefined){h.classList.remove('in-l','in-r','in-u');void h.offsetWidth;h.classList.add(dir>0?'in-r':dir<0?'in-l':'in-u')}

  const vis=visible();
  let here=vis.filter(t=>t.stage===S.stage);if(S.stage!=='done')here=priSorted(here);
  const mins=here.reduce((a,t)=>a+t.est,0);
  const sum=$('summary'),wk=$('week');
  if(S.stage==='done'){
    sum.innerHTML=here.length?`<span><b>${here.length}</b> finished</span><span><b>${fmt(mins)}</b> of work</span>`:`<span>Nothing yet</span>`;
  } else {
    wk.hidden=true;
    sum.innerHTML=here.length?`<span><b>${here.length}</b> ${here.length===1?'task':'tasks'}</span><span><b>${fmt(mins)}</b> planned</span>`:`<span>Clear for now</span>`;
  }

  const counts=Object.fromEntries(STAGES.map(s=>[s.id,vis.filter(t=>t.stage===s.id).length]));
  const max=Math.max(1,...Object.values(counts));
  document.querySelectorAll('.seg').forEach(b=>{
    const id=b.dataset.s,n=counts[id];
    b.classList.toggle('on',id===S.stage);
    const mode=S.cfg.bars||'tabs',sp=b.querySelector('.bar span'),cn=b.querySelector('.seg-n');
    b.classList.toggle('prog',mode==='today'&&id==='today');
    if(mode==='load'){sp.style.width=Math.max(8,n/max*100)+'%'}
    else if(mode==='today'&&id==='today'){const dn=vis.filter(t=>t.stage==='done'&&t.doneAt&&dkey(t.doneAt)===today()).length,tot=dn+n;sp.style.width=(tot?dn/tot*100:0)+'%';b.title=`${dn} of ${tot} done today`}
    else sp.style.width='100%';
    if(cn){cn.textContent=n;if(mode==='load'&&prevCounts[id]!==undefined&&prevCounts[id]!==n){cn.classList.remove('bump');void cn.offsetWidth;cn.classList.add('bump')}}
  });
  prevCounts=counts;

  const L=$('list');
  const secEmpty=!here.length&&S.stage!=='done'&&secOn()&&(canAddSec()||secSpaces().some(sp=>secsOf(sp).some(s=>s.stage===S.stage)));
  if(!here.length){
    const N=STAGES.map(x=>x.name);
    const msg={backlog:[`${N[0]} is empty`,'Park ideas here so they stop living in your head.'],
      week:['Nothing planned yet',`Pull a few tasks from ${N[0]} to shape your week.`],
      today:[`${N[2]} is clear`,`Pull down to add a task, or move one from ${N[1]}.`],
      done:['Nothing finished yet','Tick a task off and it lands here.']}[S.stage];
    L.innerHTML=`<li class="empty"><b>${msg[0]}</b>${msg[1]}</li>`+(secEmpty?colRows([],S.stage,'m:'+S.stage):'');
  } else if(S.stage==='done'){
    L.innerHTML=doneRows(here);
  } else L.innerHTML=colRows(here,S.stage,'m:'+S.stage);

  const sp=inSpaceMode()?spaceOf(S.space):null;
  const lists=S.list==='all'?listsHere():[listOf(S.list)];
  $('stack').innerHTML=S.list==='all'&&sp?`<span style="background:${sp.c}"></span>`:lists.slice(0,4).map(l=>`<span style="background:${l.c}"></span>`).join('');
  $('listName').textContent=S.list!=='all'?listOf(S.list).name:sp?(sp.e?sp.e+' ':'')+sp.name:'All tasks';
  if(typeof renderDesk==='function')renderDesk();
  enterId=null;
  save();
}

function go(stage){if(stage===S.stage)return;const d=idx(stage)-idx(S.stage);S.stage=stage;haptic(5);render(d)}

