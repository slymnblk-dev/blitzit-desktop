/* ---------- change + undo ---------- */
const snapshot=()=>JSON.stringify({tasks:S.tasks,lists:S.lists,spaces:S.spaces,space:S.space,list:S.list,nid:S.nid});
function commit(fn,msg){
  const snap=snapshot();
  fn();render();
  toast(msg,()=>{
    undoHash=null;const d=JSON.parse(snap);
    S.tasks=d.tasks;S.lists=d.lists;S.spaces=d.spaces;S.nid=Math.max(S.nid||0,d.nid||0);
    repairData();save();render();afterUndo();haptic(8)});
  undoHash=undoCore(); // once tasks, lists or spaces change again (another edit, a sync), this undo is withdrawn
}
/* after an undo, open sheets and pages must show the restored data, not stale copies */
function afterUndo(){
  if(cur&&$('detailSheet').classList.contains('on')){const t=S.tasks.find(x=>x.id===cur.id);if(t){cur=t;drawDetail()}else closeSheets()}
  if($('listSheet').classList.contains('on'))try{drawLists()}catch(e){}
  if(settingsOpen())drawSettings();
}
function collapse(row,cb,dx=24){
  row.style.height=row.offsetHeight+'px';void row.offsetHeight;
  row.classList.add('leave');row.querySelector('.row-in').style.transform=`translateX(${dx}px)`;
  row.style.height='0px';
  setTimeout(cb,300);
}
const doneMsg=t=>t.repeat!=='none'?`Done. Back ${t.repeat==='weekly'?'next week':t.repeat==='daily'?'tomorrow':'next weekday'}`:'Done';
function moveRow(row,stage,dx){
  const t=S.tasks.find(x=>x.id===+row.dataset.id);
  collapse(row,()=>commit(()=>setStage(t,stage),stage==='done'?doneMsg(t):`Moved to ${STAGES[idx(stage)].name}`),dx);
}

$('gauge').onclick=e=>{const b=e.target.closest('.seg');if(b)go(b.dataset.s)};

let hx=null;
$('hero').addEventListener('pointerdown',e=>hx=e.clientX);
$('hero').addEventListener('pointerup',e=>{if(hx==null)return;const d=e.clientX-hx;hx=null;
  const v=VS(),i=v.findIndex(x=>x.id===S.stage);if(d<-50&&i<v.length-1)go(v[i+1].id);if(d>50&&i>0)go(v[i-1].id)});

/* ---------- taps ---------- */
function rowClick(e){
  const row=e.target.closest('.row');if(!row||row.dataset.busy)return;
  const id=+row.dataset.id, t=S.tasks.find(x=>x.id===id);
  if(e.target.closest('[data-check]')){
    if(Date.now()-(window.__chk||0)<700)return;window.__chk=Date.now();
    row.dataset.busy=1;haptic(14);
    const toDone=t.stage!=='done';
    row.classList.add('pop');row.classList.toggle('is-done',toDone);
    setTimeout(()=>moveRow(row,toDone?'done':'today',toDone?24:-24),420);return}
  if(e.target.closest('.row-in'))openDetail(id);
}
$('list').addEventListener('click',rowClick);
$('board').addEventListener('click',rowClick);
$('list').addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- swipe + reorder ---------- */
let drag=null;
$('list').addEventListener('pointerdown',e=>{
  const inner=e.target.closest('.row-in');if(!inner||e.target.closest('[data-check]'))return;
  const row=inner.parentElement;if(row.dataset.busy)return;
  drag={inner,row,x:e.clientX,y:e.clientY,dx:0,mode:null,pid:e.pointerId};
  const d=drag;if(S.stage!=='done')d.lp=setTimeout(()=>{if(drag===d&&!d.mode)startReorder(d)},380);
});
function startReorder(d){
  d.mode='reorder';haptic(18);
  d.rows=[...$('list').querySelectorAll('.row')];
  d.idx=d.rows.indexOf(d.row);d.target=d.idx;d.h=d.row.offsetHeight;
  d.mids=d.rows.map(r=>{const b=r.getBoundingClientRect();return b.top+b.height/2});
  d.row.classList.add('lifted');d.sy0=window.scrollY;d.cy=d.y;d.dy=0;
  try{d.inner.setPointerCapture(d.pid)}catch(_){}
  // near the top/bottom edge the page scrolls, so a task can travel past the visible rows
  const auto=()=>{if(drag!==d||d.mode!=='reorder')return;
    const v=d.cy<110?-Math.ceil((110-d.cy)/12):d.cy>innerHeight-130?Math.ceil((d.cy-innerHeight+130)/12):0;
    if(v){const y0=window.scrollY;window.scrollBy(0,v);if(window.scrollY!==y0)reorderMove(d)}
    requestAnimationFrame(auto)};
  requestAnimationFrame(auto);
}
function reorderMove(d){
  const off=d.dy+window.scrollY-d.sy0;
  d.row.style.transform=`translateY(${off}px)`;
  const cy=d.mids[d.idx]+off;let t=d.idx;
  d.mids.forEach((m,i)=>{if(i<d.idx&&cy<m)t=Math.min(t,i);if(i>d.idx&&cy>m)t=Math.max(t,i)});
  if(t!==d.target){d.target=t;haptic(4)}
  d.rows.forEach((r,i)=>{if(i===d.idx)return;
    const s=(i>d.idx&&i<=t)?-d.h:(i<d.idx&&i>=t)?d.h:0;r.style.transform=s?`translateY(${s}px)`:''});
}
window.addEventListener('pointermove',e=>{
  if(!drag)return;const d=drag,dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(d.mode==='reorder'){d.dy=dy;d.cy=e.clientY;reorderMove(d);return}
  if(!d.mode){
    if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){clearTimeout(d.lp);d.mode='swipe';d.inner.classList.add('drag');try{d.inner.setPointerCapture(e.pointerId)}catch(_){}}
    else if(Math.abs(dy)>8){clearTimeout(d.lp);drag=null;return}
    else return;
  }
  const t=S.tasks.find(x=>x.id===+d.row.dataset.id),i=idx(t.stage);
  const tgt=dx>0?(i<3?STAGES[i+1]:null):(i>0?STAGES[i===3?2:i-1]:null);
  d.dx=tgt?dx:dx*.2;d.tgt=tgt;
  d.inner.style.transform=`translateX(${d.dx}px)`;
  const u=d.row.querySelector('.under'),armed=!!tgt&&Math.abs(dx)>90;
  if(armed!==!!d.armed){d.armed=armed;if(armed)haptic(10)}
  u.classList.toggle('armed',armed);
  u.style.background=tgt?color(tgt.id):'transparent';
  u.style.opacity=armed?1:Math.min(.7,Math.abs(dx)/120);
  u.style.justifyContent=dx>0?'flex-start':'flex-end';
  u.firstElementChild.textContent=tgt?(tgt.id==='done'?'Complete':tgt.name):'';
});
function endDrag(){
  if(!drag)return;const d=drag;drag=null;clearTimeout(d.lp);if(!d.mode)return;
  d.row.dataset.busy=1;setTimeout(()=>{if(d.row.isConnected)delete d.row.dataset.busy},60);
  if(d.mode==='reorder'){
    d.row.classList.add('settle');
    let off=0;d.rows.forEach((r,i)=>{if(d.target>d.idx&&i>d.idx&&i<=d.target)off+=r.offsetHeight;if(d.target<d.idx&&i<d.idx&&i>=d.target)off-=r.offsetHeight});
    d.row.style.transform=`translateY(${off}px)`;haptic(6);
    setTimeout(()=>{
      if(d.target!==d.idx){
        const ids=d.rows.map(r=>+r.dataset.id);const [m]=ids.splice(d.idx,1);ids.splice(d.target,0,m);
        const ordered=ids.map(id=>S.tasks.find(x=>x.id===id));let k=0;
        S.tasks=S.tasks.map(x=>ordered.includes(x)?ordered[k++]:x);
      }
      render();
    },220);
    return;
  }
  d.inner.classList.remove('drag');
  if(d.armed&&d.tgt){
    d.row.dataset.busy=1;
    d.inner.style.transform=`translateX(${d.dx>0?'110%':'-110%'})`;
    setTimeout(()=>{d.row.querySelector('.under').style.opacity=0;moveRow(d.row,d.tgt.id,d.dx>0?400:-400)},200);
  } else {d.inner.style.transform='';d.row.querySelector('.under').style.opacity=0}
}
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);
document.addEventListener('touchmove',e=>{if(drag&&drag.mode==='reorder')e.preventDefault()},{passive:false});

/* ---------- pull to quick add ---------- */
let pull=null;
const anyOpen=()=>document.querySelector('.sheet.on,.focus.on,.settings.on');
document.addEventListener('touchstart',e=>{
  if(!S.space||window.scrollY>2||anyOpen()||e.target.closest('input,textarea,.quick'))return;
  pull={y:e.touches[0].clientY,x:e.touches[0].clientX,h:0,on:false,armed:false};
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!pull||(drag&&drag.mode))return;
  const dy=e.touches[0].clientY-pull.y,dx=e.touches[0].clientX-pull.x;
  if(!pull.on){if(dy>10&&dy>Math.abs(dx)*1.2){pull.on=true;$('pull').classList.add('live')}else if(Math.abs(dx)>10||dy<-6){pull=null;return}else return}
  e.preventDefault();
  if(drag){clearTimeout(drag.lp);drag=null}
  pull.h=Math.max(0,Math.min(84,dy*.5));
  $('pull').style.height=pull.h+'px';
  const armed=pull.h>=58;
  if(armed!==pull.armed){pull.armed=armed;$('pull').classList.toggle('armed',armed);
    $('pullTxt').textContent=armed?'Release to add':'Pull to add';if(armed)haptic(10)}
},{passive:false});
document.addEventListener('touchend',()=>{
  if(!pull)return;const p=pull;pull=null;if(!p.on)return;
  const el=$('pull');el.classList.remove('live','armed');el.style.height='0px';
  $('pullTxt').textContent='Pull to add';
  if(p.armed)openQuick();
});
function openQuick(){
  $('quick').classList.add('on');
  const st=S.stage==='done'?'today':S.stage;
  $('quickIn').placeholder=`New task in ${STAGES[idx(st)].name}`;
  $('quickIn').focus();
}
function closeQuick(){$('quick').classList.remove('on');$('quickIn').value='';$('quickIn').blur()}
const newTask=(title,stage,list,est)=>({id:newId(),title,stage,list,est,subs:[],notes:'',repeat:'none'});
$('quickIn').addEventListener('keydown',e=>{
  if(e.key==='Escape')return closeQuick();
  if(e.key!=='Enter')return;
  const v=e.target.value.trim();if(!v)return closeQuick();
  const st=S.stage==='done'?'today':S.stage;
  const t=newTask(v,st,defaultList(),S.cfg.defEst);
  addTask(t);enterId=t.id;e.target.value='';haptic(8);
  if(S.stage!==st){S.stage=st;render(1)}else render();
});
$('quickIn').addEventListener('blur',e=>{if(!e.target.value.trim())setTimeout(()=>$('quick').classList.remove('on'),120)});

