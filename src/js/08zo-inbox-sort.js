/* ---------- Inbox: sort faster (0.242) ----------
   Computers: pointing at an item shows Today · This week · List, so it goes where it belongs in one click.
   Everywhere: "Sort inbox" walks through the items one at a time — Today, This week or Later, into the list shown
   (change it with the list button), or Skip / Delete. A thin line shows how far through you are. Keys: 1 2 3, S, Esc. */
var I_SORT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h11M4 12h7M4 17h4"/><path d="M17 10v9M14 16l3 3 3-3"/></svg>';
/* the list quick sends go to: the last one you used, else your default list, else your first list */
function ibDefList(){const ok=id=>id!=null&&S.lists.some(l=>l.id===id&&spaceOf(l.space));
  return ok(S.cfg.ibLast)?S.cfg.ibLast:ok(S.cfg.defList)?S.cfg.defList:(orderedSpaces().map(sp=>S.lists.find(l=>l.space===sp.id)).find(Boolean)||{}).id}
const ibListName=id=>{const l=listOf(id)||{},sp=spaceOf(l.space)||{};return `${sp.e?sp.e+' ':''}${sp.name||''} · ${l.name||''}`};
const IB_STAGE={today:'Today',week:'This week',backlog:'Later'};
function ibQaHTML(t){const l=ibDefList();if(l==null)return '';const nm=esc(ibListName(l));
  return `<button class="ib-qb" data-ibq="today" data-ibid2="${t.id}" title="Today, in ${nm}">Today</button><button class="ib-qb" data-ibq="week" data-ibid2="${t.id}" title="This week, in ${nm}">This week</button><button class="ib-qb" data-ibq="list" data-ibid2="${t.id}" title="Choose a list">List ▾</button>`}
/* send one item: same rules as "Send to a list" (a name, room in that stage), straight into the stage you picked */
function ibQuick(t,stage,list){
  if(list==null){toast('Add a list first');return false}
  if(!t.title.trim()){toast('Give it a name first');return false}
  if(!canPut(list,stage))return false;
  S.cfg.ibLast=list;
  commit(()=>{t.inbox=false;delete t.created;t.list=list;t.stage=stage;carryTags(t)},`Sent to ${listOf(list).name} · ${stage==='backlog'?'Backlog':IB_STAGE[stage]}`);
  try{sfx('add')}catch(e){}haptic(8);return true}

/* ---------- Sort inbox: one item at a time ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="dlg ibs" id="ibSort" role="dialog" aria-modal="true" aria-label="Sort inbox"><div class="dlg-in ibs-in" id="ibsIn"></div></div>`);
let ibsQ=[],ibsI=0,ibsList=null,ibsDone=0;
function ibSortOpen(){ibsQ=inboxItems().map(t=>t.id);if(!ibsQ.length)return;ibsI=0;ibsDone=0;ibsList=ibDefList();
  ibsDraw();$('ibSort').classList.add('on');haptic(6);setTimeout(()=>{const b=$('ibsIn').querySelector('[data-ibs="today"]');b&&b.focus()},80)}
function ibSortClose(){$('ibSort').classList.remove('on');if(ibOn)drawInbox()}
function ibsCur(){while(ibsI<ibsQ.length){const t=S.tasks.find(x=>x.id===ibsQ[ibsI]&&x.inbox&&!x.note);if(t)return t;ibsI++}return null}
function ibsDraw(){
  const t=ibsCur(),n=ibsQ.length,el=$('ibsIn');
  if(!t){el.innerHTML=`<div class="ibs-end"><span class="ibs-tick">${CHECK}</span><b>${ibsDone?'Inbox sorted':'Nothing left to sort'}</b><span>${ibsDone?`${ibsDone} ${ibsDone===1?'item':'items'} found a home.`:'Your inbox is clear.'}</span><button class="primary" data-ibs="close">Done</button></div>`;return}
  const lists=orderedSpaces().map(sp=>{const ls=S.lists.filter(l=>l.space===sp.id);return ls.length?`<optgroup label="${esc((sp.e?sp.e+' ':'')+sp.name)}">${ls.map(l=>`<option value="${l.id}"${l.id===ibsList?' selected':''}>${esc(l.name)}</option>`).join('')}</optgroup>`:''}).join('');
  el.innerHTML=`<div class="ibs-top"><span class="pg-eye">Sorting · ${Math.min(ibsI+1,n)} of ${n}</span><button class="icon-btn" data-ibs="close" aria-label="Stop sorting">${X}</button></div>
    <div class="ibs-prog" aria-hidden="true">${ibsQ.map((_,i)=>`<i class="${i<ibsI?'on':i===ibsI?'now':''}"></i>`).join('')}</div>
    <div class="ibs-t">${esc(t.title)||'Untitled'}</div>${t.est?`<div class="ibs-m">${fmt(t.est)}${t.subs.length?` · ${t.subs.length} ${t.subs.length===1?'step':'steps'}`:''}</div>`:''}
    <div class="ibs-dest">${['today','week','backlog'].map((k,i)=>`<button class="ibs-b" data-ibs="${k}"><i class="ibs-dot ibs-${k}"></i>${IB_STAGE[k]}<kbd>${i+1}</kbd></button>`).join('')}</div>
    <div class="ibs-row"><label class="ibs-list"><span class="ibs-into">Into</span><select id="ibsList" aria-label="List">${lists}</select></label>
      <button class="ibs-b soft" data-ibs="skip">Skip<kbd>S</kbd></button><button class="ibs-b soft warn" data-ibs="del" aria-label="Delete">${BIN_S}</button></div>
    <p class="ibs-hint">Keys: 1 Today · 2 This week · 3 Later · S Skip · Esc stop</p>`;
}
function ibsAct(a){
  if(a==='close')return ibSortClose();
  const t=ibsCur();if(!t)return ibSortClose();
  if(a==='skip'){ibsI++;return ibsDraw()}
  if(a==='del'){commit(()=>{S.tasks=S.tasks.filter(x=>x!==t)},'Task deleted');try{sfx('remove')}catch(e){}ibsI++;return ibsDraw()}
  if(ibQuick(t,a,ibsList)){ibsDone++;ibsI++;const c=$('ibsIn').querySelector('.ibs-t');if(c)c.classList.add('out');setTimeout(ibsDraw,160)}
}
$('ibSort').addEventListener('click',e=>{const b=e.target.closest('[data-ibs]');if(b)return ibsAct(b.dataset.ibs);if(e.target.id==='ibSort')ibSortClose()});
$('ibSort').addEventListener('change',e=>{if(e.target.id==='ibsList'){ibsList=+e.target.value||e.target.value;haptic(4)}});
/* while it's open the sorter has the keyboard (before the app's own 1–4 shortcuts) */
addEventListener('keydown',e=>{
  if(!$('ibSort').classList.contains('on'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return ibSortClose()}
  if(e.target.tagName==='SELECT'||e.metaKey||e.ctrlKey||e.altKey)return;
  const k={'1':'today','2':'week','3':'backlog',s:'skip',S:'skip'}[e.key];if(k){e.preventDefault();e.stopImmediatePropagation();ibsAct(k)}
},true);
ESC_PAGES.ibSort=()=>ibSortClose();
