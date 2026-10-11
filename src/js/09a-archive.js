/* ---------- archive: tasks, lists and spaces you remove can be archived (kept safe, restorable) or deleted for good ---------- */
/* tasks stay in S.tasks with archived:true (they still count in analytics).
   lists and spaces move into S.arch as one bundle with everything inside, so the rest of the app never sees them. */
const ARC=()=>S.arch||(S.arch=[]);
const clone=x=>JSON.parse(JSON.stringify(x));
let arcTab='tasks',arcFrom='data';
function archiveTask(t){t.archived=true;t.archivedAt=Date.now();delete t.keepUntil}
function archiveList(l){
  const tasks=S.tasks.filter(t=>t.list===l.id),id='al'+l.id;
  S.arch=ARC().filter(b=>b.id!==id);S.arch.unshift({id,kind:'list',at:Date.now(),list:clone(l),tasks:clone(tasks)});
  S.lists=S.lists.filter(x=>x!==l);S.tasks=S.tasks.filter(t=>t.list!==l.id);if(S.list===l.id)S.list='all';
}
function archiveSpace(sp){
  const ls=S.lists.filter(l=>l.space===sp.id),ids=ls.map(l=>l.id),tasks=S.tasks.filter(t=>ids.includes(t.list)),id='as'+sp.id;
  S.arch=ARC().filter(b=>b.id!==id);S.arch.unshift({id,kind:'space',at:Date.now(),space:clone(sp),lists:clone(ls),tasks:clone(tasks)});
  S.spaces=S.spaces.filter(x=>x!==sp);S.lists=S.lists.filter(l=>l.space!==sp.id);S.tasks=S.tasks.filter(t=>!ids.includes(t.list));
  if(S.space===sp.id){S.space=null;S.list='all'}
}
function restoreBundle(b){
  const addTasks=ts=>ts.forEach(t=>{if(!S.tasks.some(x=>x.id===t.id))S.tasks.push(t)});
  if(b.kind==='list'){
    const l={...b.list},sp=spaceOf(l.space)?l.space:(S.space&&spaceOf(S.space)?S.space:S.spaces[0].id);l.space=sp;
    if(!S.lists.some(x=>x.id===l.id))S.lists.push(l);addTasks(b.tasks);
  } else {
    if(!S.spaces.some(x=>x.id===b.space.id))S.spaces.push({...b.space});
    b.lists.forEach(l=>{if(!S.lists.some(x=>x.id===l.id))S.lists.push({...l,space:b.space.id})});addTasks(b.tasks);
  }
  S.arch=ARC().filter(x=>x!==b);
}
function restoreTask(t){
  if(!S.lists.some(l=>l.id===t.list))t.list=(listsHere()[0]||S.lists[0]).id;
  t.archived=false;delete t.archivedAt;t.keepUntil=Date.now();
}
/* ---------- Archived page (Settings → Data → Archived) ---------- */
const arcCounts=()=>({tasks:S.tasks.filter(t=>t.archived).length,lists:ARC().filter(b=>b.kind==='list').length,spaces:ARC().filter(b=>b.kind==='space').length});
const arcTotal=()=>{const c=arcCounts();return c.tasks+c.lists+c.spaces};
const I_RESTORE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
function archivePage(){
  const c=arcCounts(),tabs=[['tasks','Tasks'],['lists','Lists'],['spaces','Spaces']];
  const head=`<p class="sub-p">Archived items are hidden but safe. Restore them any time, or delete them for good.</p>
  <div class="segc arc-tabs" role="tablist">${tabs.map(([k,l])=>`<button data-arct="${k}" class="${arcTab===k?'on':''}" role="tab" aria-selected="${arcTab===k}">${l}<b>${c[k]}</b></button>`).join('')}</div>`;
  const acts=key=>`<button class="arc-b" data-arest="${key}" aria-label="Restore" title="Restore">${I_RESTORE}</button><button class="arc-b del" data-akill="${key}" aria-label="Delete forever" title="Delete forever">${X}</button>`;
  const when=ts=>ts?`archived ${ago(ts)}`:'';
  const n=(k,w)=>`${k} ${w}${k===1?'':'s'}`;
  let body='';
  if(arcTab==='tasks'){
    const a=S.tasks.filter(t=>t.archived).sort((x,y)=>(y.archivedAt||y.doneAt||0)-(x.archivedAt||x.doneAt||0));
    body=a.length?`<div class="set-sec arc-list">${a.map(t=>{const l=S.lists.find(x=>x.id===t.list);
      return `<div class="arc-row" data-k="t${t.id}"><span class="arc-dot" style="background:${l?l.c:'var(--muted)'}"></span><div class="arc-t"><span>${esc(t.title||'Untitled')}</span><small>${[l?esc(l.name):'',t.stage==='done'?'finished':'',when(t.archivedAt||t.doneAt)].filter(Boolean).join(' · ')}</small></div>${acts('t'+t.id)}</div>`}).join('')}</div>
      <button class="link-row warn arc-all" data-akillall="tasks">Delete all archived tasks</button>`
      :`<p class="arc-empty">No archived tasks. Use <b>Archive task</b> in a task’s ••• menu, or set Clean up to Archive.</p>`;
  } else {
    const kind=arcTab==='lists'?'list':'space',a=ARC().filter(b=>b.kind===kind);
    body=a.length?`<div class="set-sec arc-list">${a.map(b=>{
      if(kind==='list'){const sp=spaceOf(b.list.space);
        return `<div class="arc-row" data-k="${b.id}"><span class="arc-dot sq" style="background:${b.list.c}"></span><div class="arc-t"><span>${esc(b.list.name)}</span><small>${[n(b.tasks.length,'task'),sp?`from ${esc(sp.name)}`:'',when(b.at)].filter(Boolean).join(' · ')}</small></div>${acts(b.id)}</div>`}
      const s=b.space;
      return `<div class="arc-row" data-k="${b.id}"><span class="arc-sp" style="background:${s.c}">${s.e?esc(s.e):esc((s.name[0]||'?').toUpperCase())}</span><div class="arc-t"><span>${esc(s.name)}</span><small>${[n(b.lists.length,'list'),n(b.tasks.length,'task'),when(b.at)].join(' · ')}</small></div>${acts(b.id)}</div>`}).join('')}</div>`
      :`<p class="arc-empty">No archived ${arcTab}. Choose <b>Archive</b> when you remove a ${kind}${kind==='list'?' (Edit lists)':' (its ••• menu)'}.</p>`;
  }
  return head+body;
}
function arcFind(key){
  if(key[0]==='t'){const t=S.tasks.find(x=>'t'+x.id===key&&x.archived);return t&&{task:t,name:t.title||'Untitled'}}
  const b=ARC().find(x=>x.id===key);return b&&{b,name:b.kind==='list'?b.list.name:b.space.name};
}
function arcClick(e){
  const tb=e.target.closest('[data-arct]');if(tb){arcTab=tb.dataset.arct;haptic(5);drawSettings();return true}
  const rs=e.target.closest('[data-arest]');if(rs){const f=arcFind(rs.dataset.arest);if(!f)return true;haptic(8);
    if(f.task)commit(()=>restoreTask(f.task),`Restored to ${STAGES[idx(f.task.stage)].name}`);
    else commit(()=>restoreBundle(f.b),`${f.name} restored`);
    drawSettings();try{drawLists()}catch(_){}return true}
  const kl=e.target.closest('[data-akill]');if(kl){const f=arcFind(kl.dataset.akill);if(!f)return true;
    const what=f.task?'task':f.b.kind,inside=f.b?(f.b.kind==='space'?` with its ${f.b.lists.length} ${f.b.lists.length===1?'list':'lists'} and ${f.b.tasks.length} ${f.b.tasks.length===1?'task':'tasks'}`:` with its ${f.b.tasks.length} ${f.b.tasks.length===1?'task':'tasks'}`):'';
    confirmAsk({title:`Delete for good?`,text:`“${f.name}”${inside} will be deleted and can’t be restored.`,yes:'Yes, delete',no:'No',
      onYes:()=>{commit(()=>{if(f.task)S.tasks=S.tasks.filter(x=>x!==f.task);else S.arch=ARC().filter(x=>x!==f.b)},`${what[0].toUpperCase()+what.slice(1)} deleted`);drawSettings()}});return true}
  if(e.target.closest('[data-akillall]')){const n=S.tasks.filter(t=>t.archived).length;
    confirmAsk({title:'Delete all archived tasks?',text:`${n} ${n===1?'task':'tasks'} will be deleted and can’t be restored.`,yes:'Yes, delete',no:'No',
      onYes:()=>{commit(()=>S.tasks=S.tasks.filter(x=>!x.archived),'Archived tasks deleted');drawSettings()}});return true}
  return false;
}
