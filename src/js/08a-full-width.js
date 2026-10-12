/* ---------- full width (computers): inside a space the sidebar hides; a top bar switches spaces and lists ---------- */
const FW_BACK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEV_D='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const fwOn=()=>!!(S.cfg&&S.cfg.fullWidth&&S.space);
let fwPop=null;
function renderFullWidth(){
  const on=fwOn();$('desk').classList.toggle('fw',on);
  if(!on){$('fwNav').innerHTML='';fwPop=null;return}
  const sp=S.space==='all'?null:spaceOf(S.space),l=S.list!=='all'?S.lists.find(x=>x.id===S.list):null;
  const spLbl=sp?`<span class="fw-ico" style="background:${sp.c}">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span>${esc(sp.name)}`:`<span class="fw-ico all">≡</span>All tasks`;
  const lsLbl=l?`<i class="fw-dot" style="background:${l.c}"></i>${esc(l.name)}`:'All lists';
  $('fwNav').innerHTML=`<button class="fw-back" id="fwBack" title="Home  (H)">${FW_BACK}<span>Home</span></button>
    <div class="fw-crumbs"><button class="fw-pill fw-sp ${fwPop==='sp'?'open':''}" data-fwp="sp">${spLbl}${CHEV_D}</button><span class="fw-slash">/</span>
    <button class="fw-pill fw-ls ${fwPop==='ls'?'open':''}" data-fwp="ls">${lsLbl}${CHEV_D}</button>${fwPop?fwMenu():''}</div>
    <span class="fw-sub">${$('mSub').innerHTML}</span>`;
}
function fwMenu(){
  const open=(test)=>S.tasks.filter(t=>shown(t)&&test(t)&&t.stage!=='done').length;
  const tick=on=>on?`<svg class="fw-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`:'';
  if(fwPop==='sp'){
    const items=orderedSpaces().map(sp=>{const ids=S.lists.filter(l=>l.space===sp.id).map(l=>l.id);
      return `<button class="fw-it ${S.space===sp.id?'on':''}" data-fwsp="${sp.id}"><span class="fw-ico" style="background:${sp.c}">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><span class="fw-n">${esc(sp.name)}</span><em>${open(t=>ids.includes(t.list))}</em>${tick(S.space===sp.id)}</button>`}).join('');
    return `<div class="fw-menu sp" role="menu">${items}<button class="fw-it ${S.space==='all'?'on':''}" data-fwsp="all"><span class="fw-ico all">≡</span><span class="fw-n">All tasks</span><em>${open(()=>true)}</em>${tick(S.space==='all')}</button>
      <div class="fw-hr"></div><button class="fw-it fw-act" data-fwact="newsp">${PLUS_S}New space</button></div>`;
  }
  const ls=listsHere();
  return `<div class="fw-menu ls" role="menu"><button class="fw-it ${S.list==='all'?'on':''}" data-fwl="all"><span class="stack">${ls.slice(0,3).map(x=>`<span style="background:${x.c};border-color:var(--surface)"></span>`).join('')}</span><span class="fw-n">All lists</span><em>${open(t=>inSpace(t))}</em>${tick(S.list==='all')}</button>
    ${ls.map(l=>`<button class="fw-it ${S.list===l.id?'on':''}" data-fwl="${l.id}"><i class="fw-dot" style="background:${l.c}"></i><span class="fw-n">${esc(l.name)}</span><em>${open(t=>t.list===l.id)}</em>${tick(S.list===l.id)}</button>`).join('')}
    <div class="fw-hr"></div>${S.space!=='all'?`<button class="fw-it fw-act" data-fwact="newl">${PLUS_S}New list</button>`:''}<button class="fw-it fw-act" data-fwact="editl">Edit lists</button></div>`;
}
function fwClose(){if(fwPop){fwPop=null;renderFullWidth()}}
$('fwNav').addEventListener('click',e=>{
  if(e.target.closest('#fwBack')){fwPop=null;return goHome()}
  const p=e.target.closest('[data-fwp]');if(p){e.stopPropagation();fwPop=fwPop===p.dataset.fwp?null:p.dataset.fwp;haptic(5);return renderFullWidth()}
  const s=e.target.closest('[data-fwsp]');if(s){fwPop=null;return s.dataset.fwsp===S.space?renderFullWidth():openSpaceSide(s.dataset.fwsp)}
  const l=e.target.closest('[data-fwl]');if(l){fwPop=null;S.list=l.dataset.fwl;haptic(5);return render()}
  const a=e.target.closest('[data-fwact]');if(a){fwPop=null;renderFullWidth();const k=a.dataset.fwact;
    if(k==='newsp')return openSpaceSheet(null);
    if(k==='newl'){editing=false;nl={name:'',c:PALETTE[S.lists.length%PALETTE.length]};drawLists();openSheet('listSheet');setTimeout(()=>$('nlIn').focus(),300);return}
    if(k==='editl'){editing=true;nl=null;drawLists();openSheet('listSheet');return}}
});
document.addEventListener('click',e=>{if(fwPop&&!e.target.closest('.fw-crumbs'))fwClose()});
document.addEventListener('keydown',e=>{if(fwPop&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();fwClose()}},true);
$('fwMe').onclick=()=>openYou();
