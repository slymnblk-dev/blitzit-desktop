/* ---------- search & filter (optional, Settings → Tasks; on by default) ----------
   The round search button opens into a bar. Typing finds everything, grouped: tasks in every space and the Inbox
   (title, notes, steps), Inbox notes, goals (name, why, milestones) and habits, each when its feature is on.
   The filter card below narrows the board itself by priority and tags, and stays on until cleared. */
const SF={pri:new Set(),tags:new Set()};
let srchQ='',srchOpen=false,srchSel=0,srchKind='all';
const srchOn=()=>S.cfg.search!==false;
/* filters narrow a board, so they only show where there is one (a space or All tasks), not on Home */
const srchBoard=()=>!!S.space&&!spPage;
const srchFiltering=()=>SF.pri.size>0||SF.tags.size>0;
/* does a task pass the filters? (used by the board too) */
function srchPass(t){
  if(SF.pri.size&&!SF.pri.has(t.pri||''))return false;
  if(SF.tags.size&&!tagsOf(t).some(n=>SF.tags.has(tagKey(n))))return false;
  return true;
}
const srchNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function srchHits(){
  const q=srchNorm(srchQ.trim());if(!q&&!srchFiltering())return [];
  const words=q.split(/\s+/).filter(Boolean),ib=typeof inboxOn==='function'&&inboxOn();
  const hay=t=>srchNorm([t.title,t.notes,...t.subs.map(s=>s.t),...tagsOf(t).map(n=>'#'+n)].join(' '));
  return S.tasks.filter(t=>!t.archived&&!t.note&&(shown(t)||(ib&&t.inbox))&&srchPass(t)&&words.every(w=>hay(t).includes(w)))
    .sort((a,b)=>(a.stage==='done')-(b.stage==='done')||(srchNorm(b.title).startsWith(words[0]||'~'))-(srchNorm(a.title).startsWith(words[0]||'~'))).slice(0,30);
}
/* everything else that matches: notes, goals, habits (not while the board filters are on: those narrow tasks) */
function srchGroups(){
  const q=srchNorm(srchQ.trim()),words=q.split(/\s+/).filter(Boolean),has=s=>{const h=srchNorm(s);return words.every(w=>h.includes(w))};
  const g={task:srchHits(),note:[],goal:[],habit:[]};if(!q||srchFiltering())return g;
  if(typeof inboxOn==='function'&&inboxOn())g.note=inboxNotes().filter(t=>has(t.notes||t.title)).slice(0,10);
  if(typeof goalsOn==='function'&&goalsOn())g.goal=gList().filter(x=>x&&gSpaceOk(x)&&has([x.name,x.why,...(x.ms||[]).flatMap(m=>[m.t,...(m.items||[]).map(i=>i.t)])].join(' '))).sort((a,b)=>!!a.done-!!b.done).slice(0,8);
  if(typeof habitsOn==='function'&&habitsOn())g.habit=hbAll().filter(h=>has(h.name)).slice(0,8);
  return g;
}
const SR_KINDS=[['task','Tasks'],['note','Notes'],['goal','Goals'],['habit','Habits']];
const srchKindsOn=()=>SR_KINDS.filter(([k])=>k==='task'||(k==='note'?typeof inboxOn==='function'&&inboxOn():k==='goal'?typeof goalsOn==='function'&&goalsOn():typeof habitsOn==='function'&&habitsOn()));
function srchPh(){const k=srchKindsOn().map(x=>x[1].toLowerCase());return k.length<2?'Search tasks':`Search ${k.slice(0,-1).join(', ')} and ${k[k.length-1]}`}
/* tags you can filter by: the lists of the open space (or all lists) */
function srchTagPool(){
  const ls=S.space&&S.space!=='all'?S.lists.filter(l=>l.space===S.space):S.lists,m=new Map();
  ls.forEach(l=>ltags(l).forEach(n=>{if(!m.has(tagKey(n)))m.set(tagKey(n),n)}));
  S.tasks.forEach(t=>{if(ls.some(l=>l.id===t.list))tagsOf(t).forEach(n=>{if(!m.has(tagKey(n)))m.set(tagKey(n),n)})});
  SF.tags.forEach(k=>{if(!m.has(k))m.set(k,k)});
  return [...m.entries()];
}
const srchMark=(s,q)=>{const w=srchNorm(q.trim()).split(/\s+/).filter(Boolean)[0];s=String(s||'');if(!w)return esc(s);const i=srchNorm(s).indexOf(w);return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+w.length))+'</mark>'+esc(s.slice(i+w.length))};
/* a note's line that holds the match, so you see why it was found */
function srchSnip(t){const w=srchNorm(srchQ.trim()).split(/\s+/).filter(Boolean)[0]||'',ls=String(t.notes||'').split('\n').slice(1).map(x=>x.trim()).filter(Boolean);
  const l=ls.find(x=>srchNorm(x).includes(w))||ls[0]||'';if(!l)return '';const i=Math.max(0,srchNorm(l).indexOf(w)-24);return (i?'…':'')+l.slice(i,i+90)}
const srHbDays=h=>{const d=h.days||[0,1,2,3,4,5,6],k=String(d);return d.length===7?'Every day':k==='1,2,3,4,5'?'Weekdays':k==='0,6'?'Weekends':`${d.length} days a week`};
function srchRow(k,x,i){const sel=i===srchSel?' sel':'',q=srchQ;
  if(k==='task'){const t=x,pr=priOf(t);
    if(t.inbox)return `<button class="sr-item${sel}" data-srt="${t.id}" role="option"><span class="sr-ic">${IB_ICON}</span><span class="sr-tx"><b>${srchMark(t.title,q)}</b><small>Inbox</small></span></button>`;
    const l=listOf(t.list),sp=spaceOf(l.space);
    return `<button class="sr-item${sel} ${t.stage==='done'?'done':''}" data-srt="${t.id}" role="option"><i class="sr-st" style="background:${color(t.stage)}"></i><span class="sr-tx"><b>${srchMark(t.title,q)}</b><small>${sp?esc(sp.name)+' › ':''}${esc(l.name)} · ${esc(STAGES[idx(t.stage)].name)}</small></span>${pr?`<span class="sr-pr ${pr.id}">${priIcon(pr.n)}</span>`:''}</button>`}
  if(k==='note'){const sn=srchSnip(x);
    return `<button class="sr-item${sel}" data-srn="${x.id}" role="option"><span class="sr-ic">${I_NOTE2}</span><span class="sr-tx"><b>${srchMark(x.title,q)}</b>${sn?`<span class="sr-sn">${srchMark(sn,q)}</span>`:''}<small>Note · ${esc(nbWhen(x))}</small></span></button>`}
  if(k==='goal'){const ms=x.ms||[],dn=ms.filter(m=>m.done).length,w=srchNorm(q.trim()).split(/\s+/)[0]||'',inName=srchNorm(x.name).includes(w),left=gDaysLeft(x);
    const hit=!inName&&ms.find(m=>srchNorm(m.t).includes(w)),ih=!inName&&!hit&&ms.map(m=>[m,(m.items||[]).find(i=>srchNorm(i.t).includes(w))]).find(([,i])=>i);
    const meta=x.done?'Achieved':[ms.length?`${dn} of ${ms.length} milestones`:'',left!==null&&left>=0?`${left} ${left===1?'day':'days'} left`:''].filter(Boolean).join(' · ');
    const sm=hit?hit.id:ih?ih[0].id:'',sub=hit?`Milestone: ${srchMark(hit.t,q)}`:ih?`${srchMark(ih[1].t,q)} · in ${esc(ih[0].t)}`:`Goal${meta?' · '+meta:''}`;
    return `<button class="sr-item${sel}" data-srg="${x.id}"${sm?` data-srm="${esc(sm)}"`:''} role="option"><span class="sr-ic g">${G_FLAG}</span><span class="sr-tx"><b>${x.e?esc(x.e)+' ':''}${srchMark(x.name,q)}</b><small>${sub}</small></span></button>`}
  const st=hbStats(x).st;
  return `<button class="sr-item${sel}" data-srh="${x.id}" role="option"><span class="sr-ic">${RH_ICON}</span><span class="sr-tx"><b>${x.e?esc(x.e)+' ':''}${srchMark(x.name,q)}</b><small>Habit · ${srHbDays(x)}${st>1?` · ${st}-day streak`:''}</small></span></button>`}
function srchResults(){
  const ks=srchKindsOn();
  if(!srchQ.trim()&&!srchFiltering())return `<p class="sr-hint">${ks.length<2?'Find any task in any space.':`Find ${ks.map(x=>x[1].toLowerCase()).join(', ').replace(/, ([^,]*)$/,' and $1')}.`} Press <kbd>Enter</kbd> to open the first one.</p>`;
  const g=srchGroups(),full=SR_KINDS.filter(([k])=>g[k].length);
  if(!full.length)return `<p class="sr-hint">Nothing matches.</p>`;
  const kind=full.some(([k])=>k===srchKind)?srchKind:'all',show=kind==='all'?full:full.filter(([k])=>k===kind);
  const n=full.reduce((a,[k])=>a+g[k].length,0);let i=0;
  /* the kind chips only show when the results are of more than one kind */
  const chips=full.length>1?`<div class="sr-kinds" role="group" aria-label="Show only">${[['all','All',n],...full.map(([k,l])=>[k,l,g[k].length])].map(([k,l,c])=>`<button class="sr-k${kind===k?' on':''}" data-srk="${k}" aria-pressed="${kind===k}">${l} <span>${c}</span></button>`).join('')}</div>`:'';
  return chips+`<div class="sr-list" role="listbox" aria-label="Results">${show.map(([k,l])=>`${show.length>1||full.length>1?`<div class="sr-h">${l}</div>`:''}${g[k].map(x=>srchRow(k,x,i++)).join('')}`).join('')}</div>`;
}
function srchFilterCard(){
  const pool=srchTagPool();
  return `<div class="sf-card"><div class="sf-head"><span>Filter the board</span>${srchFiltering()?`<button class="sf-clear" data-sfclear>Clear</button>`:''}</div>
    <div class="sf-row pri-row"><span class="sf-l">Priority</span><div class="sf-chips">${PRIS.map(p=>`<button class="sf-chip pri ${p.id} ${SF.pri.has(p.id)?'on':''}" data-sfp="${p.id}">${priIcon(p.n)}${p.name}</button>`).join('')}</div></div>
    <div class="sf-row"><span class="sf-l">Tags</span><div class="sf-chips">${pool.length?pool.map(([k,n])=>`<button class="sf-chip ${SF.tags.has(k)?'on':''}" data-sft="${esc(k)}">#${esc(n)}</button>`).join(''):'<span class="sf-none">No tags yet. Add them in a task.</span>'}</div></div></div>`;
}
function srchDraw(){
  const p=$('srch');if(!p)return;
  p.querySelector('.sr-body').innerHTML=srchResults()+(srchBoard()?srchFilterCard():'');
}
function srchChip(){
  const c=$('srchChip'),n=SF.pri.size+SF.tags.size;
  document.querySelectorAll('.srch-btn').forEach(b=>b.classList.toggle('filtering',n>0));
  if(!c)return;c.hidden=!n||!srchOn();
  if(n)c.innerHTML=`<span>Filtered</span><b>${[...[...SF.pri].map(p=>PRIS.find(x=>x.id===p).name),...[...SF.tags].map(k=>'#'+k)].slice(0,2).map(esc).join(', ')}${n>2?` +${n-2}`:''}</b><i data-sfclear aria-label="Clear filters">${X}</i>`;
}
function srchPlace(){
  const p=$('srch'),b=[...document.querySelectorAll('.srch-btn')].find(x=>x.offsetParent!==null);if(!p||!b)return;
  const r=b.getBoundingClientRect(),w=Math.min(440,innerWidth-24);
  p.style.top=r.top+'px';p.style.width=w+'px';
  p.style.left=Math.max(12,Math.min(r.right-w,innerWidth-w-12))+'px';
  p.style.setProperty('--from',(r.right-Math.max(12,Math.min(r.right-w,innerWidth-w-12))-r.width)+'px');
}
function openSearch(){
  if(!srchOn())return;
  if(!$('srch')){const p=document.createElement('div');p.id='srch';p.className='srch';p.setAttribute('role','dialog');p.setAttribute('aria-label','Search and filter');
    p.innerHTML=`<div class="sr-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="srchIn" placeholder="Search tasks" autocomplete="off" spellcheck="false" enterkeyhint="search"><button class="sr-x" data-srx aria-label="Close search">${X}</button></div><div class="sr-body"></div>`;
    document.body.appendChild(p)}
  srchOpen=true;srchSel=0;srchKind='all';srchPlace();srchDraw();
  const p=$('srch'),inp=$('srchIn');p.inert=false;inp.value=srchQ;inp.placeholder=srchPh();
  document.body.classList.add('srch-on');
  try{inp.focus({preventScroll:true})}catch(e){} // right away, so phones open the keyboard
  requestAnimationFrame(()=>p.classList.add('on'));
  haptic(5);
}
function closeSearch(){
  const p=$('srch');if(!p||!srchOpen)return;srchOpen=false;
  p.classList.remove('on');p.inert=true;document.body.classList.remove('srch-on'); // closed: out of the Tab order
  try{document.activeElement&&document.activeElement.blur()}catch(e){}
}
function srchClear(){SF.pri.clear();SF.tags.clear();render();srchChip();if(srchOpen)srchDraw()}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-srch]')){e.stopPropagation();srchOpen?closeSearch():openSearch();return}
  if(e.target.closest('[data-sfclear]')){e.stopPropagation();haptic(5);srchClear();return}
  const p=$('srch');if(!p||!srchOpen)return;
  if(!e.target.closest('#srch')){closeSearch();return}
  if(e.target.closest('[data-srx]')){closeSearch();return}
  const k=e.target.closest('[data-srk]');if(k){srchKind=k.dataset.srk;srchSel=0;haptic(4);srchDraw();$('srchIn').focus({preventScroll:true});return}
  const it=e.target.closest('[data-srt]');if(it){const id=+it.dataset.srt,t=S.tasks.find(x=>x.id===id);closeSearch();if(t&&t.inbox)srchToInbox();setTimeout(()=>openDetail(id),120);return}
  const nt=e.target.closest('[data-srn]');if(nt){const id=+nt.dataset.srn;closeSearch();srchToInbox();setTimeout(()=>openNote(id),160);return}
  const go=e.target.closest('[data-srg]');if(go){closeSearch();openGoal(go.dataset.srg);if(go.dataset.srm&&gdOn){gSelId=go.dataset.srm;drawGoal()}return}
  if(e.target.closest('[data-srh]')){closeSearch();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();openRhythm();return}
  const fp=e.target.closest('[data-sfp]');if(fp){const v=fp.dataset.sfp;SF.pri.has(v)?SF.pri.delete(v):SF.pri.add(v);haptic(5);sfx('toggle');render();srchChip();srchDraw();return}
  const ft=e.target.closest('[data-sft]');if(ft){const v=ft.dataset.sft;SF.tags.has(v)?SF.tags.delete(v):SF.tags.add(v);haptic(5);sfx('toggle');render();srchChip();srchDraw();return}
},true);
/* notes and Inbox tasks open in the Inbox, so it comes forward first */
function srchToInbox(){if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof glOn!=='undefined'&&glOn)closeGoals();if(!ibOn)openInbox()}
document.addEventListener('input',e=>{if(e.target.id!=='srchIn')return;srchQ=e.target.value;srchSel=0;srchDraw()});
document.addEventListener('keydown',e=>{
  if(srchOpen&&e.target.id==='srchIn'){
    const items=[...document.querySelectorAll('#srch .sr-item')];
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSearch();return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!items.length)return;srchSel=(srchSel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((x,i)=>x.classList.toggle('sel',i===srchSel));items[srchSel].scrollIntoView({block:'nearest'});return}
    if(e.key==='Enter'){e.preventDefault();const it=items[srchSel];if(it)it.click();return}
    e.stopPropagation();return;
  }
  if(srchOpen&&e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSearch();return}
  // "/" or Ctrl/⌘+K opens search (not while typing)
  if(!srchOn()||e.target.closest('input,textarea,[contenteditable]')||document.querySelector('.sheet.on')||settingsOpen())return;
  if(e.key==='/'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();e.stopPropagation();openSearch()}
},true);
addEventListener('resize',()=>{if(srchOpen)srchPlace()});
/* show / hide the buttons with the setting */
function srchApply(){document.body.classList.toggle('no-srch',!srchOn());if(!srchOn()){closeSearch();if(srchFiltering()){SF.pri.clear();SF.tags.clear();render()}}srchChip()}
