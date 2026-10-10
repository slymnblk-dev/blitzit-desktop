/* ---------- spaces ---------- */
function openSpace(id){S.space=id;S.list='all';S.colFocus=null;if(S.cfg&&!S.cfg.showDone&&S.stage==='done')S.stage='today';haptic(6);applyColFocus(false);render(0);window.scrollTo(0,0)}
function goHome(){S.space=null;S.colFocus=null;haptic(5);applyColFocus(false);render();window.scrollTo(0,0)}
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
  const dl=e.target.closest('[data-del]');if(dl){closePops();return askDeleteSpace(dl.dataset.del)}
  if(document.querySelector('.sp-pop.on')){closePops();return}
  const c=e.target.closest('[data-space]');if(c)return openSpace(c.dataset.space);
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
document.addEventListener('click',e=>{if(!e.target.closest('.sp-card'))closePops()});
const cardKey=e=>{const c=e.target.closest('.sp-card');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openSpace(c.dataset.space)}};
$('homeView').addEventListener('keydown',cardKey);$('dHome').addEventListener('keydown',cardKey);
let spDraft=null;
function openSpaceSheet(id){
  const sp=id?spaceOf(id):null;
  spDraft=sp?{...sp}:{id:null,name:'',c:PALETTE[S.spaces.length%PALETTE.length],e:''};
  spDraft.touched=!!(sp&&sp.e);
  $('spTitle').textContent=sp?'Edit space':'New space';$('spName').value=spDraft.name;
  $('spDel').hidden=!sp||S.spaces.length<2;$('spPin').hidden=!sp;
  drawSpaceSheet();openSheet('spaceSheet');setTimeout(()=>{if($('spaceSheet').classList.contains('on'))$('spName').focus()},300);
}
function drawSpaceSheet(){
  $('spSw').innerHTML=PALETTE.map(c=>`<button data-c="${c}" class="${spDraft.c===c?'on':''}" style="background:${c}" aria-label="Colour"></button>`).join('');
  $('spPinTg').setAttribute('aria-pressed',!!spDraft.pinned);
  $('spSave').textContent=spDraft.id?'Save':'Create space';$('spSave').disabled=!spDraft.name.trim();
  $('spSave').style.background=spDraft.c;
  const pv=$('spPrev');pv.style.background=spDraft.c;pv.textContent=spDraft.e||((spDraft.name.trim()[0]||'?').toUpperCase());
  $('spIcons').innerHTML=`<button data-ico="" class="ico-none ${!spDraft.e?'on':''}" aria-label="No icon">${esc((spDraft.name.trim()[0]||'A').toUpperCase())}</button>`+ICONS.map(i=>`<button data-ico="${i}" class="${spDraft.e===i?'on':''}" aria-label="Icon ${i}">${i}</button>`).join('');
}
$('spSw').onclick=e=>{const b=e.target.closest('[data-c]');if(b){spDraft.c=b.dataset.c;haptic(5);drawSpaceSheet()}};
$('spName').oninput=e=>{spDraft.name=e.target.value;if(!spDraft.touched)spDraft.e=autoIcon(spDraft.name);drawSpaceSheet()};
$('spIcons').onclick=e=>{const b=e.target.closest('[data-ico]');if(!b)return;spDraft.e=b.dataset.ico;spDraft.touched=true;haptic(5);drawSpaceSheet()};
$('spName').onkeydown=e=>{if(e.key==='Enter'&&spDraft.name.trim())$('spSave').click()};
$('spSave').onclick=()=>{
  const d=spDraft;if(!d.name.trim())return;
  if(d.id){const sp=spaceOf(d.id);Object.assign(sp,{name:d.name.trim(),c:d.c,e:d.e,autoSet:true,pinned:!!d.pinned});closeSheets();render();drawLists();return toast('Space saved')}
  const sp={id:'s'+newId(),name:d.name.trim(),c:d.c,e:d.e,autoSet:true};S.spaces.push(sp);
  S.lists.push({id:'l'+newId(),name:'General',c:d.c,space:sp.id});
  closeSheets();openSpace(sp.id);toast(`${sp.name} created`);
};
$('spPin').onclick=()=>{spDraft.pinned=!spDraft.pinned;haptic(5);drawSpaceSheet()};
$('spDel').onclick=()=>{const id=spDraft.id;closeSheets();setTimeout(()=>askDeleteSpace(id),250)};
function askDeleteSpace(id){
  const sp=spaceOf(id);if(!sp)return;
  if(S.spaces.length<2)return toast('You need at least one space');
  const ls=S.lists.filter(l=>l.space===id).map(l=>l.id),nt=S.tasks.filter(t=>ls.includes(t.list)).length;
  confirmDanger({title:`Delete ${sp.name}?`,
    text:`This deletes the space, its ${ls.length} ${ls.length===1?'list':'lists'} and ${nt} ${nt===1?'task':'tasks'}.`,
    word:sp.name,yes:'Delete space',
    onYes:()=>commit(()=>{S.spaces=S.spaces.filter(x=>x.id!==id);S.lists=S.lists.filter(l=>l.space!==id);S.tasks=S.tasks.filter(t=>!ls.includes(t.list));if(S.space===id){S.space=null;S.list='all'}},`${sp.name} deleted`)});
}
let dlgYes=null;
function confirmDanger({title,text,word,yes,onYes}){
  $('dlgT').textContent=title;$('dlgP').textContent=text;$('dlgW').textContent=word;$('dlgIn').value='';$('dlgYes').textContent=yes;$('dlgYes').disabled=true;
  $('dlgIn').dataset.word=word;dlgYes=onYes;$('dlg').classList.add('on');haptic(12);setTimeout(()=>$('dlgIn').focus(),200);
}
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
  const inp=b.nextElementSibling;b.hidden=true;inp.hidden=false;inp.focus();
});
$('board').addEventListener('keydown',e=>{
  const inp=e.target.closest('.ca-in');if(!inp)return;
  if(e.key==='Escape'&&$('dlg').classList.contains('on')){closeDlg();return}
  if(e.key==='Escape'){e.stopPropagation();inp.value='';inp.blur();return}
  if(e.key!=='Enter')return;const v=inp.value.trim();if(!v)return;
  const t=newTask(v,inp.closest('.col').dataset.s,defaultList(),S.cfg.defEst);
  S.tasks.push(t);enterId=t.id;inp.value='';haptic(6);render();
  const sc=inp.closest('.col-scroll');sc.scrollTop=sc.scrollHeight;
});
$('board').addEventListener('focusout',e=>{
  const inp=e.target.closest('.ca-in');if(!inp||inp.value.trim())return;
  setTimeout(()=>{inp.hidden=true;inp.previousElementSibling.hidden=false},120);
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
  const rows=[...ul.querySelectorAll('.row')].filter(r=>r!==bd.row);
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
  const apply=()=>{
    if(t.stage!==target)setStage(t,target);
    if(target!=='done'){const ordered=ids.map(id=>S.tasks.find(x=>x.id===id)).filter(Boolean);let k=0;
      S.tasks=S.tasks.map(x=>ordered.includes(x)?ordered[k++]:x)}
  };
  haptic(8);
  if(t.stage!==target)commit(apply,target==='done'?doneMsg(t):`Moved to ${STAGES[idx(target)].name}`);
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

