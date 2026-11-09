/* ---------- Inbox, "two quiet halves" (0.266) ----------
   Tasks to sort on one side, notes like paper on the other (stacked on phones). No tabs, no Sort:
   both halves are ordered by when you added them (newest first), grouped by day (Today, Yesterday, a date).
   Each day folds away with one tap and stays folded (this device). Each half has its own quiet add line:
   tasks add on Enter; notes add on Enter (Shift + Enter for a new line). Pinned notes sit on top. */
var ibFold=(()=>{try{return new Set(JSON.parse(localStorage.getItem('wd-ibfold')||'[]'))}catch(e){return new Set()}})();
const ibFoldSave=()=>{try{localStorage.setItem('wd-ibfold',JSON.stringify([...ibFold].slice(-60)))}catch(e){}};
const ibDayKey=ms=>{const d=new Date(ms||Date.now());return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`};
function ibDayName(ms){const d=new Date(ms||Date.now()),t=new Date();t.setHours(0,0,0,0);const x=new Date(d);x.setHours(0,0,0,0);const days=Math.round((t-x)/DAY);
  if(days===0)return 'Today';if(days===1)return 'Yesterday';
  return d.toLocaleDateString(undefined,days<7?{weekday:'long'}:{weekday:'short',month:'short',day:'numeric'})}
/* newest first, by the day they were added */
function ibGroups(list){const g=[];for(const t of [...list].sort((a,b)=>(b.created||0)-(a.created||0))){const k=ibDayKey(t.created);let x=g.find(y=>y.k===k);if(!x){x={k,name:ibDayName(t.created),items:[]};g.push(x)}x.items.push(t)}return g}
const ibTime=t=>t.created?new Date(t.created).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'';
function ibDayHead(side,g){const id=side+':'+g.k,f=ibFold.has(id);
  return `<button class="ib2-day${f?' folded':''}" data-ibfold="${id}" aria-expanded="${!f}"><span>${esc(g.name)}</span><small>${g.items.length}</small>${CHEV}</button>`}
/* a task row: same as before, without "Added …" (the day says it) */
const _ib2Row=ibRow;
ibRow=function(t){return _ib2Row(t).replace(/<span class="mi ib-when">[^<]*<\/span>/,'').replace(/<div class="meta"><\/div>/,'')};
drawInbox=function(){
  const items=inboxItems(),notes=inboxNotes(),nT=items.length,nN=notes.length;
  const pinned=notes.filter(t=>t.pin),rest=notes.filter(t=>!t.pin);
  const sum=nT||nN?`${nT?`<b>${nT}</b> ${nT===1?'task':'tasks'} to sort`:'Nothing to sort'} · ${nN} ${nN===1?'note':'notes'}`:'All clear';
  const tGroups=ibGroups(items).map(g=>`<div class="ib2-g">${ibDayHead('t',g)}${ibFold.has('t:'+g.k)?'':`<ul class="list ib-list">${g.items.map(ibRow).join('')}</ul>`}</div>`).join('');
  const nGroups=(pinned.length?`<div class="ib2-g"><div class="ib2-day pin"><span>Pinned</span><small>${pinned.length}</small></div><div class="ib2-notes">${pinned.map(ibNoteCard).join('')}</div></div>`:'')
    +ibGroups(rest).map(g=>`<div class="ib2-g">${ibDayHead('n',g)}${ibFold.has('n:'+g.k)?'':`<div class="ib2-notes">${g.items.map(ibNoteCard).join('')}</div>`}</div>`).join('');
  $('ibIn').innerHTML=`<h1 class="ib-h">Inbox</h1><div class="pg-sum ib-sum">${sum}</div>
    <div class="ib2">
      <section class="ib2-half" aria-label="Tasks to sort"><div class="ib2-cap"><span>To sort</span><small>${nT}</small></div>
        ${tGroups||'<p class="ib2-none">Nothing waiting. Add a task here, then send it to a list when you’re ready.</p>'}
        <label class="ib2-add"><b aria-hidden="true">+</b><input id="ibNew" placeholder="Add a task" maxlength="120" enterkeyhint="done" autocomplete="off" aria-label="New task"></label></section>
      <section class="ib2-half ib2-nh" aria-label="Notes"><div class="ib2-cap note"><span>Notes</span><small>${nN}</small></div>
        ${nGroups||'<p class="ib2-none">Ideas, lists, anything you want to keep. Not a task yet.</p>'}
        <label class="ib2-add note"><b aria-hidden="true">+</b><textarea id="ibNewN" rows="1" placeholder="Add a note" maxlength="4000" aria-label="New note"></textarea></label></section>
    </div>`;
  enterId=null;
};
ibKind='task';
function ib2AddNote(){const i=$('ibNewN'),v=(i&&i.value||'').trim();if(!v)return;
  const t={id:newId(),title:nbTitle(v),stage:'backlog',list:null,est:0,subs:[],notes:v,repeat:'none',inbox:true,note:true,created:Date.now()};
  S.tasks.push(t);enterId=t.id;save();sfx('add');haptic(8);drawInbox();if(typeof renderDesk==='function')renderDesk();$('ibNewN').focus()}
$('inboxPg').addEventListener('click',e=>{const f=e.target.closest('[data-ibfold]');if(!f)return;e.stopPropagation();const id=f.dataset.ibfold;
  ibFold.has(id)?ibFold.delete(id):ibFold.add(id);ibFoldSave();haptic(4);try{sfx('toggle')}catch(err){}drawInbox()},true);
$('inboxPg').addEventListener('keydown',e=>{if(e.target.id!=='ibNewN')return;
  if(e.key==='Escape'){if(e.target.value){e.target.value='';ibGrow(e.target);e.stopPropagation()}return}
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ib2AddNote()}},true);
$('inboxPg').addEventListener('input',e=>{if(e.target.id==='ibNewN')ibGrow(e.target)});
/* keep a note you're typing when the page redraws (edits, undo, sync) */
const _ib2Render=render;
render=function(d){const a=document.activeElement,typingN=ibOn&&a&&a.id==='ibNewN'?a.value:null;_ib2Render(d);
  if(typingN!=null){const n=$('ibNewN');if(n){n.value=typingN;ibGrow(n);n.focus()}}};
