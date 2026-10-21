/* ---------- search & filter (optional, Settings → Tasks; on by default) ----------
   The round search button opens into a bar. Typing finds tasks in every space (title, notes, steps).
   The filter card below narrows the board itself by priority and tags, and stays on until cleared. */
const SF={pri:new Set(),tags:new Set()};
let srchQ='',srchOpen=false,srchSel=0;
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
  const words=q.split(/\s+/).filter(Boolean);
  const hay=t=>srchNorm([t.title,t.notes,...t.subs.map(s=>s.t),...tagsOf(t).map(n=>'#'+n)].join(' '));
  return S.tasks.filter(t=>!t.archived&&shown(t)&&srchPass(t)&&words.every(w=>hay(t).includes(w)))
    .sort((a,b)=>(a.stage==='done')-(b.stage==='done')||(srchNorm(b.title).startsWith(words[0]||'~'))-(srchNorm(a.title).startsWith(words[0]||'~'))).slice(0,30);
}
/* tags you can filter by: the lists of the open space (or all lists) */
function srchTagPool(){
  const ls=S.space&&S.space!=='all'?S.lists.filter(l=>l.space===S.space):S.lists,m=new Map();
  ls.forEach(l=>ltags(l).forEach(n=>{if(!m.has(tagKey(n)))m.set(tagKey(n),n)}));
  S.tasks.forEach(t=>{if(ls.some(l=>l.id===t.list))tagsOf(t).forEach(n=>{if(!m.has(tagKey(n)))m.set(tagKey(n),n)})});
  SF.tags.forEach(k=>{if(!m.has(k))m.set(k,k)});
  return [...m.entries()];
}
const srchMark=(s,q)=>{const w=srchNorm(q.trim()).split(/\s+/).filter(Boolean)[0];s=String(s||'');if(!w)return esc(s);const i=srchNorm(s).indexOf(w);return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+w.length))+'</mark>'+esc(s.slice(i+w.length))};
function srchResults(){
  const hits=srchHits();
  if(!srchQ.trim()&&!srchFiltering())return `<p class="sr-hint">Find any task in any space. Press <kbd>Enter</kbd> to open the first one.</p>`;
  if(!hits.length)return `<p class="sr-hint">No tasks match.</p>`;
  return `<div class="sr-list" role="listbox">${hits.map((t,i)=>{const l=listOf(t.list),sp=spaceOf(l.space),pr=priOf(t);
    return `<button class="sr-item ${i===srchSel?'sel':''} ${t.stage==='done'?'done':''}" data-srt="${t.id}" role="option"><i class="sr-st" style="background:${color(t.stage)}"></i><span class="sr-tx"><b>${srchMark(t.title,srchQ)}</b><small>${sp?esc(sp.name)+' › ':''}${esc(l.name)} · ${esc(STAGES[idx(t.stage)].name)}</small></span>${pr?`<span class="sr-pr ${pr.id}">${priIcon(pr.n)}</span>`:''}</button>`}).join('')}</div>`;
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
  srchOpen=true;srchSel=0;srchPlace();srchDraw();
  const p=$('srch'),inp=$('srchIn');inp.value=srchQ;
  document.body.classList.add('srch-on');
  try{inp.focus({preventScroll:true})}catch(e){} // right away, so phones open the keyboard
  requestAnimationFrame(()=>p.classList.add('on'));
  haptic(5);
}
function closeSearch(){
  const p=$('srch');if(!p||!srchOpen)return;srchOpen=false;
  p.classList.remove('on');document.body.classList.remove('srch-on');
  try{document.activeElement&&document.activeElement.blur()}catch(e){}
}
function srchClear(){SF.pri.clear();SF.tags.clear();render();srchChip();if(srchOpen)srchDraw()}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-srch]')){e.stopPropagation();srchOpen?closeSearch():openSearch();return}
  if(e.target.closest('[data-sfclear]')){e.stopPropagation();haptic(5);srchClear();return}
  const p=$('srch');if(!p||!srchOpen)return;
  if(!e.target.closest('#srch')){closeSearch();return}
  if(e.target.closest('[data-srx]')){closeSearch();return}
  const it=e.target.closest('[data-srt]');if(it){const id=+it.dataset.srt;closeSearch();setTimeout(()=>openDetail(id),120);return}
  const fp=e.target.closest('[data-sfp]');if(fp){const v=fp.dataset.sfp;SF.pri.has(v)?SF.pri.delete(v):SF.pri.add(v);haptic(5);sfx('toggle');render();srchChip();srchDraw();return}
  const ft=e.target.closest('[data-sft]');if(ft){const v=ft.dataset.sft;SF.tags.has(v)?SF.tags.delete(v):SF.tags.add(v);haptic(5);sfx('toggle');render();srchChip();srchDraw();return}
},true);
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
