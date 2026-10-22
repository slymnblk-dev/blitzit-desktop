/* ---------- spaces ---------- */
function openSpace(id){spPage=null;fwPeek=null;S.space=id;S.list='all';S.colFocus=null;if(S.cfg&&!S.cfg.showDone&&S.stage==='done')S.stage='today';haptic(6);applyColFocus(false);render(0);window.scrollTo(0,0)}
function goHome(){spPage=null;fwPeek=null;S.space=null;S.colFocus=null;haptic(5);applyColFocus(false);render();window.scrollTo(0,0)}
$('homeBtn').onclick=goHome;
$('mEdit').onclick=()=>inSpaceMode()&&openSpaceSheet(S.space);$('brandBtn').onclick=goHome;
document.querySelector('.side .brand').onclick=goHome;
const closePops=()=>document.querySelectorAll('.sp-pop.on').forEach(x=>x.classList.remove('on'));
const homeClick=e=>{
  const mo=e.target.closest('[data-more]');
  if(mo){e.stopPropagation();const pop=mo.closest('.sp-card').querySelector('.sp-pop'),was=pop.classList.contains('on');closePops();if(!was){pop.classList.remove('up');pop.classList.add('on');
    const r=pop.getBoundingClientRect(),dock=document.querySelector('.dock'),lim=(dock&&getComputedStyle(dock).display!=='none'?dock.getBoundingClientRect().top:innerHeight)-8;
    if(r.bottom>lim)pop.classList.add('up')}haptic(5);return}
  const pn=e.target.closest('[data-pin]');if(pn){closePops();return togglePin(pn.dataset.pin)}
  const ed=e.target.closest('[data-edit]');if(ed){closePops();return openSpaceSheet(ed.dataset.edit)}
  const ar=e.target.closest('[data-sparc]');if(ar){closePops();return askArchiveSpace(ar.dataset.sparc)}
  const dl=e.target.closest('[data-del]');if(dl){closePops();return askDeleteSpace(dl.dataset.del)}
  // list card ⋯ menu (Full width → a space's lists)
  const lpm=e.target.closest('[data-lpm]');
  if(lpm){e.stopPropagation();const pop=lpm.parentNode.querySelector('.lp-pop'),was=pop.classList.contains('on');closePops();
    if(!was){pop.classList.remove('up');pop.classList.add('on');if(pop.getBoundingClientRect().bottom>innerHeight-8)pop.classList.add('up')}haptic(5);return}
  if(e.target.closest('.lp-pop')){
    const ls=id=>S.lists.find(x=>x.id===id);
    const rn=e.target.closest('[data-lpren]');if(rn){closePops();return lpRename(rn.dataset.lpren)}
    const c=e.target.closest('[data-lpc]');if(c){const l=ls(c.dataset.lpl);if(l){l.c=c.dataset.lpc;haptic(5);save();render()}return}
    const mv=e.target.closest('[data-lpmv]');if(mv){const l=ls(mv.dataset.lpl),nx=spaceOf(mv.dataset.lpmv);if(!l||!nx)return;
      commit(()=>{l.space=nx.id;if(S.list===l.id)S.list='all'},`${l.name} moved to ${nx.name}`);return}
    const ed=e.target.closest('[data-lped]');if(ed){closePops();const id=ed.dataset.lped,l=ls(id);if(!l)return;openSpaceSide(l.space);editing=true;nl=null;leOpen=id;leSub=null;drawLists();openSheet('listSheet');return}
    const ar=e.target.closest('[data-lparc]');if(ar){closePops();const l=ls(ar.dataset.lparc);if(l)commit(()=>archiveList(l),`${l.name} archived`);return}
    const dl=e.target.closest('[data-lpdel]');if(dl){closePops();const l=ls(dl.dataset.lpdel);if(!l)return;const n=S.tasks.filter(t=>t.list===l.id).length;
      confirmDanger({title:`Delete ${l.name}?`,text:`This deletes the list and its ${n} ${n===1?'task':'tasks'} for good. To keep them safe, choose Archive list instead.`,word:l.name,yes:'Delete list',
        onYes:()=>commit(()=>{S.lists=S.lists.filter(x=>x!==l);S.tasks=S.tasks.filter(t=>t.list!==l.id);if(S.list===l.id)S.list='all'},`${l.name} deleted`)});return}
    return;
  }
  if(document.querySelector('.sp-pop.on')){closePops();return}
  if(e.target.closest('[data-spback]')){spPage=null;fwPeek=null;haptic(5);render();return}
  const lp=e.target.closest('[data-lp]');if(lp){const id=spPage,l=lp.dataset.lp;openSpaceSide(id);S.list=l;haptic(5);render();return}
  if(e.target.closest('[data-lpnew]')){const id=spPage;openSpaceSide(id);editing=false;nl={name:'',c:PALETTE[S.lists.length%PALETTE.length]};drawLists();openSheet('listSheet');setTimeout(()=>$('nlIn').focus(),300);return}
  const c=e.target.closest('[data-space]');if(c){const id=c.dataset.space;
    if(spPageOn()&&S.lists.filter(l=>l.space===id).length>1){spPage=id;fwPeek=id;haptic(5);render();$('dHome').scrollTop=0;return}
    return openSpace(id)}
  if(e.target.closest('#spNew'))return openSpaceSheet(null);
  if(e.target.closest('#allTasks'))return openSpace('all');
  if(e.target.closest('#tdBlitz')){e.stopPropagation();const c=e.target.closest('.td-card'),id=c&&c.dataset.sp;
    if(!id)return $('goBtn').click();
    const q=S.tasks.filter(t=>shown(t)&&t.stage==='today'&&listOf(t.list).space===id);return q.length?startBlitz(q):$('goBtn').click()}
  if(e.target.closest('#tdOpen')){const id=e.target.closest('#tdOpen').dataset.sp;S.stage='today';return openSpace(id||'all')}
  if(e.target.closest('#bkNow')){doBackup().then(ok=>{if(!ok){openSettings();setView='data';drawSettings()}});return}
  if(e.target.closest('#bkSign')){openSettings();setView='account';drawSettings();return}
  if(e.target.closest('#bkLater')){S.bkSnooze=Date.now()+7*DAY;save();render();toast('We’ll remind you next week');return}
};
$('homeView').addEventListener('click',homeClick);$('dHome').addEventListener('click',homeClick);
document.addEventListener('click',e=>{if(!e.target.closest('.sp-card')&&!e.target.closest('.lp-pop'))closePops()});
/* rename a list right on its card: Enter saves, Esc cancels */
function lpRename(id){
  const l=S.lists.find(x=>x.id===id),card=document.querySelector(`.lp-card[data-lp="${id}"]`);if(!l||!card)return;
  const nm=card.querySelector('.lp-name'),inp=document.createElement('input');
  inp.className='lp-name lp-ren';inp.value=l.name;inp.maxLength=40;inp.setAttribute('aria-label','List name');nm.replaceWith(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok&&v&&v!==l.name)commit(()=>{l.name=v},'List renamed');else render()};
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();fin(true)}else if(e.key==='Escape'){e.preventDefault();fin(false)}});
  inp.addEventListener('click',e=>e.stopPropagation());inp.addEventListener('blur',()=>fin(true));
}
const cardKey=e=>{const c=e.target.closest('.sp-card');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openSpace(c.dataset.space)}};
$('homeView').addEventListener('keydown',cardKey);$('dHome').addEventListener('keydown',cardKey);
let spDraft=null,spSub=null;
function openSpaceSheet(id){
  const sp=id?spaceOf(id):null;
  spDraft=sp?{...sp}:{id:null,name:'',c:PALETTE[S.spaces.length%PALETTE.length],e:''};
  spDraft.touched=!!(sp&&sp.e);spSub=null;
  $('spTitle').textContent=sp?'Edit space':'New space';$('spName').value=spDraft.name;
  $('spActs').hidden=!sp||S.spaces.length<2;
  drawSpaceSheet();openSheet('spaceSheet');setTimeout(()=>{if($('spaceSheet').classList.contains('on'))$('spName').focus()},300);
}
function drawSpaceSheet(){
  const d=spDraft,letter=(d.name.trim()[0]||'?').toUpperCase();
  $('spSave').textContent=d.id?'Save':'Create space';$('spSave').disabled=!d.name.trim();
  $('spSave').style.background=d.c;
  const blank=!d.name.trim()&&!d.e,pv=$('spPrev');pv.classList.toggle('blank',blank);pv.style.background=blank?'':d.c;pv.style.setProperty('--spc',d.c);pv.textContent=blank?'+':(d.e||letter);
  // name sits up top; icon and colour fold away until wanted, so the sheet stays calm
  $('spOpts').innerHTML=
    lxRow('i','Icon',blank?'Auto':`<span class="lx-ico">${esc(d.e||letter)}</span>`,`<div class="ico-grid" id="spIcons"><button data-ico="" class="ico-none ${!d.e?'on':''}" aria-label="No icon">${esc((d.name.trim()[0]||'A').toUpperCase())}</button>${ICONS.map(i=>`<button data-ico="${i}" class="${d.e===i?'on':''}" aria-label="Icon ${i}">${i}</button>`).join('')}</div>`,spSub==='i')+
    lxRow('c','Colour',`<i class="lx-dot" style="background:${d.c}"></i>`,`<div class="sw" id="spSw">${PALETTE.map(c=>`<button data-c="${c}" class="${d.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>`,spSub==='c')+
    (d.id?`<div class="lx"><button class="lx-h" id="spPin" type="button" aria-label="Pin to top"><span class="lx-l">Pin to top</span><span class="tg" id="spPinTg" aria-pressed="${!!d.pinned}"></span></button></div>`:'');
}
$('spOpts').onclick=e=>{
  const t=e.target.closest('[data-lxt]');if(t){lxToggle(t,v=>spSub=v);return}
  const c=e.target.closest('#spSw [data-c]');if(c){spDraft.c=c.dataset.c;haptic(5);drawSpaceSheet();return}
  const i=e.target.closest('#spIcons [data-ico]');if(i){spDraft.e=i.dataset.ico;spDraft.touched=true;haptic(5);drawSpaceSheet();return}
  if(e.target.closest('#spPin')){spDraft.pinned=!spDraft.pinned;haptic(5);$('spPinTg').setAttribute('aria-pressed',!!spDraft.pinned)}
};
/* tapping the big preview tile unfolds the icon choices */
$('spPrev').onclick=()=>{const t=$('spOpts').querySelector('[data-lxt="i"]');if(t&&spSub!=='i')lxToggle(t,v=>spSub=v)};
$('spName').oninput=e=>{spDraft.name=e.target.value;if(!spDraft.touched)spDraft.e=autoIcon(spDraft.name);drawSpaceSheet()};
$('spName').onkeydown=e=>{if(e.key==='Enter'&&spDraft.name.trim())$('spSave').click()};
$('spSave').onclick=()=>{
  const d=spDraft;if(!d.name.trim())return;
  if(d.id){const sp=spaceOf(d.id);Object.assign(sp,{name:d.name.trim(),c:d.c,e:d.e,autoSet:true,pinned:!!d.pinned});closeSheets();render();drawLists();return toast('Space saved')}
  const sp={id:'s'+newId(),name:d.name.trim(),c:d.c,e:d.e,autoSet:true};S.spaces.push(sp);
  S.lists.push({id:'l'+newId(),name:'General',c:d.c,space:sp.id});
  closeSheets();openSpace(sp.id);toast(`${sp.name} created`);
};
$('spArc').onclick=()=>{const id=spDraft.id;closeSheets();setTimeout(()=>askArchiveSpace(id),250)};
$('spDel').onclick=()=>{const id=spDraft.id;closeSheets();setTimeout(()=>askDeleteSpace(id),250)};
function askArchiveSpace(id){
  const sp=spaceOf(id);if(!sp)return;if(S.spaces.length<2)return toast('You need at least one space');
  commit(()=>archiveSpace(sp),`${sp.name} archived`);
}
function askDeleteSpace(id){
  const sp=spaceOf(id);if(!sp)return;
  if(S.spaces.length<2)return toast('You need at least one space');
  const ls=S.lists.filter(l=>l.space===id).map(l=>l.id),nt=S.tasks.filter(t=>ls.includes(t.list)).length;
  confirmDanger({title:`Delete ${sp.name}?`,
    text:`This deletes the space, its ${ls.length} ${ls.length===1?'list':'lists'} and ${nt} ${nt===1?'task':'tasks'} for good. To keep them safe, choose Archive instead.`,
    word:sp.name,yes:'Delete space',
    onYes:()=>commit(()=>{S.spaces=S.spaces.filter(x=>x.id!==id);S.lists=S.lists.filter(l=>l.space!==id);S.habits=(S.habits||[]).filter(h=>h.space!==id);S.hchains=(S.hchains||[]).filter(c=>c.space!==id);S.tasks=S.tasks.filter(t=>!ls.includes(t.list));if(S.space===id){S.space=null;S.list='all'}},`${sp.name} deleted`)});
}
let dlgYes=null;
function confirmDanger({title,text,word,yes,no,onYes}){
  const typed=!!word;$('dlg').classList.toggle('simple',!typed);
  $('dlgT').textContent=title;$('dlgP').textContent=text;$('dlgW').textContent=word||'';$('dlgIn').value='';$('dlgYes').textContent=yes;$('dlgNo').textContent=no||'Cancel';$('dlgYes').disabled=typed;
  $('dlgIn').dataset.word=word||'';dlgYes=onYes;$('dlg').classList.add('on');haptic(12);setTimeout(()=>(typed?$('dlgIn'):$('dlgYes')).focus(),200);
}
/* quick yes / no question, e.g. before deleting one task */
const confirmAsk=o=>confirmDanger({...o,word:null});
document.addEventListener('keydown',e=>{if(!$('dlg').classList.contains('on')||!$('dlg').classList.contains('simple'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeDlg()}
  else if(e.key==='Enter'&&document.activeElement!==$('dlgNo')){e.preventDefault();e.stopImmediatePropagation();$('dlgYes').click()}},true);
function closeDlg(){$('dlg').classList.remove('on');dlgYes=null;$('dlgIn').blur()}
$('dlgIn').oninput=e=>{$('dlgYes').disabled=e.target.value.trim().toLowerCase()!==e.target.dataset.word.trim().toLowerCase()};
$('dlgIn').onkeydown=e=>{if(e.key==='Enter'&&!$('dlgYes').disabled)$('dlgYes').click();if(e.key==='Escape'){e.stopPropagation();closeDlg()}};
$('dlgNo').onclick=closeDlg;$('dlg').onclick=e=>{if(e.target===$('dlg'))closeDlg()};
$('dlgYes').onclick=()=>{const f=dlgYes;closeDlg();if(f)f()};
$('editSpace').onclick=()=>{if(inSpaceMode()){closeSheets();setTimeout(()=>openSpaceSheet(S.space),250)}};

/* sidebar: click the open space again to fold / unfold its lists */
function openSpaceSide(id){S.subHidden=false;openSpace(id)}
function toggleSub(){
  const sub=document.querySelector('#sLists .s-sub');haptic(5);
  if(sub&&!S.subHidden){
    sub.style.height=sub.scrollHeight+'px';sub.style.overflow='hidden';void sub.offsetHeight;
    sub.classList.add('closing');sub.style.height='0px';
    setTimeout(()=>{S.subHidden=true;S.list='all';save();render()},230);
  } else {
    S.subHidden=false;render();
    const n=document.querySelector('#sLists .s-sub');if(!n)return;
    const h=n.scrollHeight;n.style.height='0px';n.style.overflow='hidden';void n.offsetHeight;
    n.classList.add('opening');n.style.height=h+'px';
    setTimeout(()=>{n.style.height='';n.style.overflow='';n.classList.remove('opening')},300);
  }
}

/* column quick add */
$('board').addEventListener('click',e=>{
  const b=e.target.closest('.ca-btn');if(!b)return;
  const add=b.closest('.col-add'),row=add.querySelector('.ca-row');add.classList.add('typing');row.hidden=false;row.querySelector('.ca-in').focus();
});
$('board').addEventListener('keydown',e=>{
  const inp=e.target.closest('.ca-in');if(!inp)return;
  if(e.key==='Escape'&&$('dlg').classList.contains('on')){closeDlg();return}
  if(e.key==='Escape'){e.stopPropagation();inp.value='';inp.blur();return}
  if(e.key!=='Enter')return;const v=inp.value.trim();if(!v)return;
  const t=newTask(v,inp.closest('.col').dataset.s,defaultList(),S.cfg.defEst);
  if(!canPut(t.list,t.stage))return;
  S.tasks.push(t);enterId=t.id;inp.value='';haptic(6);sfx('add');render();
  const sc=inp.closest('.col-scroll');sc.scrollTop=sc.scrollHeight;
});
$('board').addEventListener('focusout',e=>{
  const inp=e.target.closest('.ca-in');if(!inp||inp.value.trim())return;
  setTimeout(()=>{if(document.activeElement===inp)return;const add=inp.closest('.col-add');add.classList.remove('typing');inp.closest('.ca-row').hidden=true},120);
});

/* drag between columns */
let bd=null;
$('board').addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const inner=e.target.closest('.col-list .row-in');if(!inner||e.target.closest('[data-check]'))return;
  bd={row:inner.parentElement,x:e.clientX,y:e.clientY,on:false};
});
window.addEventListener('pointermove',e=>{
  if(!bd)return;
  if(!bd.on){
    if(Math.hypot(e.clientX-bd.x,e.clientY-bd.y)<6)return;
    bd.on=true;bd.home=bd.row.parentElement;bd.next=bd.row.nextSibling;const r=bd.row.getBoundingClientRect();
    bd.ox=bd.x-r.left;bd.oy=bd.y-r.top;
    const g=bd.row.cloneNode(true);g.classList.add('ghost');g.classList.remove('enter');g.style.width=(r.width+32)+'px';
    document.body.appendChild(g);bd.ghost=g;bd.row.classList.add('placeholder');
    document.body.style.cursor='grabbing';
  }
  bd.ghost.style.left=(e.clientX-bd.ox-16)+'px';bd.ghost.style.top=(e.clientY-bd.oy)+'px';
  const el=document.elementFromPoint(e.clientX,e.clientY),col=el&&el.closest('.col');
  document.querySelectorAll('.col.over').forEach(c=>c!==col&&c.classList.remove('over'));
  if(!col){if(bd.col){bd.col=null;bd.home.insertBefore(bd.row,bd.next&&bd.next.parentElement===bd.home?bd.next:null)}return}
  col.classList.add('over');bd.col=col;
  const ul=col.querySelector('.col-list');ul.querySelector('.col-empty')?.remove();
  if(col.dataset.s==='done'){if(bd.row.parentElement!==ul)ul.prepend(bd.row);return}
  const rows=[...ul.querySelectorAll('.row, .sec-h')].filter(r=>r!==bd.row);
  const before=rows.find(r=>{const b=r.getBoundingClientRect();return e.clientY<b.top+b.height/2});
  if(before){if(before.previousElementSibling!==bd.row)ul.insertBefore(bd.row,before)}
  else if(ul.lastElementChild!==bd.row)ul.appendChild(bd.row);
});
window.addEventListener('pointerup',()=>{
  if(!bd)return;const d=bd;bd=null;if(!d.on)return;
  d.ghost.remove();document.body.style.cursor='';
  document.querySelectorAll('.col.over').forEach(c=>c.classList.remove('over'));
  d.row.dataset.busy=1;
  const col=d.col;if(!col){render();return}
  const target=col.dataset.s,t=S.tasks.find(x=>x.id===+d.row.dataset.id);
  const ids=[...col.querySelectorAll('.col-list .row')].map(r=>+r.dataset.id);
  const nbr=(dir)=>{for(let n=dir<0?d.row.previousElementSibling:d.row.nextElementSibling;n;n=dir<0?n.previousElementSibling:n.nextElementSibling){if(n.classList.contains('sec-h'))return null;if(n.classList.contains('row'))return S.tasks.find(x=>x.id===+n.dataset.id)}return null};
  const priBad=target!=='done'&&priBreaks(t,nbr(-1),nbr(1));
  const sec=secOn()&&target!=='done'?secAbove(d.row):undefined,secMoved=sec!==undefined&&(sec||null)!==((secOfTask(t)||{}).id||null);
  const apply=()=>{
    if(t.stage!==target)setStage(t,target);
    if(sec!==undefined){if(sec)t.sec=sec;else delete t.sec}
    if(target!=='done'){const ordered=ids.map(id=>S.tasks.find(x=>x.id===id)).filter(Boolean);let k=0;
      S.tasks=S.tasks.map(x=>ordered.includes(x)?ordered[k++]:x)}
  };
  haptic(8);
  if(priBad)setTimeout(()=>priHint(t),250);
  if(t.stage!==target&&!canPut(t.list,target,t)){render();return}
  if(t.stage!==target)commit(apply,target==='done'?doneMsg(t):sec?`Moved to ${secFind(sec).sec.name}`:`Moved to ${STAGES[idx(target)].name}`);
  else if(secMoved)commit(apply,sec?`Moved to ${secFind(sec).sec.name}`:'Moved out of the section');
  else{apply();render()}
});

/* keyboard */
document.addEventListener('keydown',e=>{
  if($('dlg').classList.contains('on')){
    if(e.key==='Escape'){e.preventDefault();closeDlg();return}
    if(e.key==='Tab'){const f=[...$('dlg').querySelectorAll('input,button:not([disabled])')];if(f.length){const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}}
    return;
  }
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(tideOn()){
    if(e.key==='Escape'){e.preventDefault();return tideLeave()}
    if(e.key===' '&&e.target.id!=='tIn'&&T&&(T.mode==='run'||T.mode==='pause')){e.preventDefault();const b=$('tide').querySelector(`[data-a="${T.mode==='run'?'pause':'resume'}"]`);b&&b.click();return}
    return;
  }
  const inFocus=$('focus').classList.contains('on');
  if(e.key==='Escape'){
    if(inFocus){$('focus').classList.contains('sum')?closeFocus():$('fClose').click()}
    else if(document.querySelector('.sheet.on'))closeSheets();
    else if(settingsOpen())closeSettings();
    else if(S.colFocus){setColFocus(null)}
    return;
  }
  if(e.target.closest('input,textarea,[contenteditable]'))return;
  if(inFocus){
    fReveal();
    if(e.key===' '){e.preventDefault();$('fPause').click()}
    else if(e.key==='Enter'&&!$('focus').classList.contains('sum')){e.preventDefault();$('fDone').click()}
    return;
  }
  if(document.querySelector('.sheet.on')||settingsOpen())return;
  if(e.key===','){e.preventDefault();openSettings();return}
  if(e.key==='?'){e.preventDefault();openSettings();setView='shortcuts';drawSettings();return}
  if(e.key==='p'&&!document.querySelector('.sheet.on')&&!settingsOpen()){e.preventDefault();openYou();return}
  if(e.key==='['){e.preventDefault();toggleSide();return}
  if(e.key==='h'||e.key==='H'){e.preventDefault();return goHome()}
  if(/^[1-4]$/.test(e.key)&&S.space&&matchMedia('(min-width:1100px)').matches){e.preventDefault();const st=VS()[+e.key-1];if(!st)return;const id=st.id;setColFocus(S.colFocus===id?null:id);return}
  if(e.key==='n'||e.key==='N'){e.preventDefault();$('addBtn').click()}
  else if(e.key==='b'||e.key==='B'){e.preventDefault();$('goBtn').click()}
});
matchMedia('(min-width:1100px)').addEventListener('change',()=>render());

