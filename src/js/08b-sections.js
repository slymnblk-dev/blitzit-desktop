/* ---------- sections: optional named, foldable groups inside a column (Settings → Tasks, off by default) ----------
   A space keeps its sections: sp.secs=[{id,name,stage,shut}]. A task joins one with t.sec.
   A task only shows in a section while it sits in that section's column and space; otherwise it is a loose task. */
const secOn=()=>!!(S.cfg&&S.cfg.sections);
const secsOf=sp=>sp&&Array.isArray(sp.secs)?sp.secs:[];
const I_SEC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h10"/></svg>';
const SEC_CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
function secFind(id){for(const sp of S.spaces||[]){const s=secsOf(sp).find(x=>x.id===id);if(s)return {sp,sec:s}}return null}
function secOfTask(t){if(!t||!t.sec)return null;const f=secFind(t.sec);if(!f||f.sec.stage!==t.stage||listOf(t.list).space!==f.sp.id)return null;return f.sec}
/* sections a task could join: its own space, its own column */
const secsForTask=t=>secsOf(spaceOf(listOf(t.list).space)).filter(s=>s.stage===t.stage);
/* which spaces' sections show right now: the open space, or every space on "All tasks" */
const secSpaces=()=>S.space==='all'?orderedSpaces():S.space?[spaceOf(S.space)].filter(Boolean):[];
const canAddSec=()=>secOn()&&S.space&&S.space!=='all';

function secHead(s,ts,sp){
  return `<li class="sec-h ${s.shut?'shut':''}" data-sec="${s.id}"><button class="sec-tg" data-sectg="${s.id}" aria-expanded="${!s.shut}">${SEC_CHEV}<span class="sec-n">${esc(s.name)}</span>${sp?`<span class="sec-sp">${esc(sp.name)}</span>`:''}<span class="sec-c">${ts.length}</span></button><button class="sec-more" data-secm="${s.id}" aria-label="Section options">${DOTS3}</button></li>`;
}
/* the rows of one column: loose tasks first (folded if that is on), then each section */
function colRows(here,stage,key){
  if(!secOn()||stage==='done')return foldRows(here,key);
  const desk=key[0]==='d',all=S.space==='all';
  const secs=secSpaces().flatMap(sp=>secsOf(sp).filter(s=>s.stage===stage).map(s=>({s,sp})));
  const by=new Map(secs.map(x=>[x.s.id,[]])),loose=[];
  here.forEach(t=>{const s=secOfTask(t);if(s&&by.has(s.id))by.get(s.id).push(t);else loose.push(t)});
  let out=foldRows(loose,key);
  secs.forEach(({s,sp})=>{const ts=by.get(s.id);if(all&&!ts.length)return;
    out+=secHead(s,ts,all?sp:null)+(s.shut?'':ts.length?ts.map(rowHTML).join(''):`<li class="sec-empty">${desk?'Drag tasks here':'Empty. Open a task to add it here.'}</li>`)});
  if(!desk&&canAddSec())out+=`<li class="sec-new-row"><button class="sec-new" data-secnew="${stage}">${PLUS_S}New section</button></li>`;
  return out;
}
/* the section a dropped row lands in: the closest section header above it */
function secAbove(row){for(let n=row.previousElementSibling;n;n=n.previousElementSibling){if(n.classList.contains('sec-h'))return n.dataset.sec;}return null}

function secNew(stage){
  const sp=spaceOf(S.space);if(!sp)return;
  const s={id:'x'+newId(),name:'',stage};sp.secs=[...secsOf(sp),s];
  render();secRename(s.id,true);
}
function secRename(id,isNew){
  const li=[...document.querySelectorAll(`.sec-h[data-sec="${id}"]`)].find(x=>x.offsetParent!==null),f=secFind(id);if(!f)return;if(!li){if(!f.sec.name){f.sp.secs=secsOf(f.sp).filter(x=>x!==f.sec);save();render()}return}
  const n=li.querySelector('.sec-n');
  const inp=document.createElement('input');inp.className='sec-in';inp.maxLength=40;inp.value=f.sec.name;inp.placeholder='Section name';inp.setAttribute('autocomplete','off');inp.setAttribute('aria-label','Section name');
  n.replaceWith(inp);li.classList.add('naming');inp.focus();inp.select();
  let done=false;
  const end=keep=>{if(done)return;done=true;const v=inp.value.replace(/\s+/g,' ').trim();
    if(keep&&v){f.sec.name=v;haptic(6)}
    else if(isNew||!f.sec.name){f.sp.secs=secsOf(f.sp).filter(x=>x!==f.sec)}
    save();render()};
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();end(true)}else if(e.key==='Escape'){e.preventDefault();end(false)}});
  inp.addEventListener('blur',()=>end(true));
  inp.addEventListener('click',e=>e.stopPropagation());
  inp.addEventListener('pointerdown',e=>e.stopPropagation());
}
function secDelete(id){
  const f=secFind(id);if(!f)return;const n=S.tasks.filter(t=>t.sec===id).length;
  const go=()=>commit(()=>{f.sp.secs=secsOf(f.sp).filter(x=>x.id!==id);S.tasks.forEach(t=>{if(t.sec===id)delete t.sec})},'Section deleted');
  confirmAsk({title:'Delete this section?',text:n?`“${f.sec.name}” goes away. Its ${n} ${n===1?'task stays':'tasks stay'} in the column.`:`“${f.sec.name}” goes away.`,yes:'Yes, delete',no:'No',onYes:go});
}
/* small menu for a section: Rename, Delete */
function secMenu(btn){
  closeSecMenu();const id=btn.dataset.secm,r=btn.getBoundingClientRect();
  const m=document.createElement('div');m.className='sec-pop';m.id='secPop';
  m.innerHTML=`<button data-secren="${id}">Rename</button><button class="warn" data-secdel="${id}">Delete section</button>`;
  document.body.appendChild(m);
  const w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';
  m.style.top=(r.bottom+h+8>innerHeight?r.top-h-4:r.bottom+4)+'px';
  requestAnimationFrame(()=>m.classList.add('on'));
}
function closeSecMenu(){const m=$('secPop');if(m)m.remove()}
function secToggle(id){const f=secFind(id);if(!f)return;f.sec.shut=!f.sec.shut;haptic(5);save();render()}

document.addEventListener('click',e=>{
  const pop=e.target.closest('#secPop');
  if(pop){const r=e.target.closest('[data-secren]'),d=e.target.closest('[data-secdel]');closeSecMenu();
    if(r)secRename(r.dataset.secren);else if(d)secDelete(d.dataset.secdel);return}
  closeSecMenu();
  const m=e.target.closest('[data-secm]');if(m){e.stopPropagation();secMenu(m);return}
  const tg=e.target.closest('[data-sectg]');if(tg){e.stopPropagation();if(!tg.closest('.naming'))secToggle(tg.dataset.sectg);return}
  const nw=e.target.closest('[data-secnew]');if(nw){e.stopPropagation();secNew(nw.dataset.secnew);return}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('secPop')){e.stopPropagation();closeSecMenu()}},true);
addEventListener('resize',closeSecMenu);
document.addEventListener('scroll',closeSecMenu,true);
