/* ---------- A full column: a clear message in the middle that stays until you close it (0.298) ----------
   Each list holds at most 10 tasks per stage (Backlog, My week, Today). When something would go over, this card explains it,
   and when you were adding a new task (and the Inbox is on) it offers to keep that task in the Inbox instead. */
document.body.insertAdjacentHTML('beforeend',`<div class="cap" id="capDlg" role="alertdialog" aria-modal="true" aria-labelledby="capT" aria-describedby="capP"><div class="cap-in">
  <span class="cap-ico" id="capIco"></span><h3 id="capT"></h3><p id="capP"></p><div class="cap-task" id="capTask" hidden></div><p class="cap-tip" id="capTip"></p>
  <div class="cap-b"><button class="cap-ib" id="capInbox" hidden></button><button class="cap-ok" id="capOk">OK</button></div></div></div>`);
let capNew=null;
const CAP_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>';
function capOpen(list,stage,nw){
  const st=STAGES[idx(stage)],l=listOf(list),ib=!!(nw&&nw.title&&typeof inboxOn==='function'&&inboxOn());capNew=ib?nw:null;
  const d=$('capDlg');d.style.setProperty('--cc',`var(--${stage})`);
  $('capIco').innerHTML=CAP_I;$('capT').textContent=`${st.name} is full`;
  $('capP').innerHTML=`<b>${esc(l.name)}</b> already has ${STAGE_MAX} tasks in ${esc(st.name)}. That’s the most, so the list stays focused.`;
  $('capTask').hidden=!ib;if(ib)$('capTask').textContent=nw.title;
  $('capTip').textContent=ib?'Finish or move one first, or keep this task in your Inbox for now and sort it in later.':'Finish or move one first, then try again.';
  $('capInbox').hidden=!ib;$('capInbox').textContent='Keep it in the Inbox';$('capOk').textContent=ib?'Not now':'OK';$('capOk').classList.toggle('alt',ib);
  d.classList.add('on');haptic([10,40,10]);if(matchMedia('(min-width:1100px)').matches)setTimeout(()=>(ib?$('capInbox'):$('capOk')).focus(),60);
}
function capClose(){$('capDlg').classList.remove('on');capNew=null}
$('capOk').onclick=capClose;
$('capInbox').onclick=()=>{const nw=capNew;capClose();if(!nw)return;
  const t={id:newId(),title:nw.title,stage:'backlog',list:null,est:S.cfg.defEst||30,subs:[],notes:'',repeat:'none',inbox:true,created:Date.now()};
  commit(()=>S.tasks.push(t),'Saved to your Inbox');try{sfx('add')}catch(e){}if(nw.after)try{nw.after()}catch(e){}};
document.addEventListener('keydown',e=>{if(!$('capDlg').classList.contains('on'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();capClose()}},true);
/* the check itself: same rule, the new message instead of a short toast. A 4th argument {title, after} marks a brand-new task. */
canPut=function(list,stage,skip,nw){if(stageRoom(list,stage,skip))return true;capOpen(list,stage,nw);return false};
