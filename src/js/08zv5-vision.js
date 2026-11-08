/* ---------- Vision board (optional mode, Settings → Modes, 0.309) ----------
   A board per year of photos, quotes, a word of the year and goal cards, in a masonry grid.
   Cards live in S.vision: {id, k:'photo'|'quote'|'word'|'goal', t:text/caption, g:goal id, area, size:'s'|'m'|'l', year, c:colour, ord, at}
   — synced, backed up and undoable like the other modes. Photos are big, so they are shrunk (≈80–160 KB) and kept
   on this device only (IndexedDB "wd-vision"); another device shows a calm placeholder until that's added.
   Phones: a Vision tab. Computers: "Vision" under Modes. Morning look: a full-screen slideshow.
   Home shows "Today's vision" (one card a day). Save as wallpaper: a phone-sized PNG of the board. */
var vbOn=false,vbYear=new Date().getFullYear(),vbArea='',vbAddArea=false,vbE=null,vbCleaned=false;
function visionOn(){return !!(S.cfg&&S.cfg.vision)}
const VB_MAX=40;
var VB_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/></svg>';
const VB_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const VB_DL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
const VB_COLORS=['#FF8A5B','#7CE0A8','#8FB4FF','#B98CFF','#F5C77E','#F4F4F5'];
const VB_KINDS=[['photo','Photo'],['quote','Quote'],['word','Word'],['goal','Goal']];
const vbAll=()=>S.vision||(S.vision=[]);
const vbYearOf=c=>+c.year||new Date(c.at||Date.now()).getFullYear();
const vbCards=y=>vbAll().filter(c=>vbYearOf(c)===y).sort((a,b)=>(a.ord||0)-(b.ord||0)||(a.at||0)-(b.at||0));
const vbAreas=()=>Array.isArray(S.cfg.vAreas)?S.cfg.vAreas:['Health','Career','Home','Travel'];
const vbYears=()=>[...new Set([new Date().getFullYear(),vbYear,...vbAll().map(vbYearOf)])].sort();
const vbWord=y=>{const w=vbCards(y).find(c=>c.k==='word');return w?w.t:''};
const vbGoal=c=>c&&c.g!=null?(S.goals||[]).find(g=>String(g.id)===String(c.g)):null;
const vbDesk=()=>matchMedia('(min-width:1100px)').matches;

/* ---------- photos: shrunk, kept on this device ---------- */
const vbDB=(()=>{let p=null;const db=()=>p||(p=new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no storage'));const r=indexedDB.open('wd-vision',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const run=(m,f)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('img',m),q=f(t.objectStore('img'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));
  return {get:k=>run('readonly',s=>s.get(String(k))),put:(k,v)=>run('readwrite',s=>s.put(v,String(k))),keys:()=>run('readonly',s=>s.getAllKeys()),del:k=>run('readwrite',s=>s.delete(String(k)))}})();
const vbImg={};let vbImgT=null;
function vbLoad(cs){cs.filter(c=>c.k==='photo'&&!(c.id in vbImg)).forEach(c=>{vbImg[c.id]=null;
  vbDB.get(c.id).then(u=>{vbImg[c.id]=u||''}).catch(()=>{vbImg[c.id]=''}).then(()=>{clearTimeout(vbImgT);vbImgT=setTimeout(()=>{if(vbOn)drawVision();vbHomePaint(true)},30)})})}
function vbShrink(file){return new Promise((res,rej)=>{if(!file||!/^image\//.test(file.type))return rej(new Error('Pick a photo'));
  const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const mx=1080,s=Math.min(1,mx/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);let q=.82,d=c.toDataURL('image/jpeg',q);while(d.length>215000&&q>.45){q-=.08;d=c.toDataURL('image/jpeg',q)}res(d)};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('That file could not be read as a photo'))};img.src=u})}
/* photos of cards that are gone (deleted on any device) are cleared once a session, when the board opens */
function vbClean(){if(vbCleaned)return;vbCleaned=true;const ids=new Set(vbAll().map(c=>String(c.id)));vbDB.keys().then(ks=>(ks||[]).forEach(k=>{if(!ids.has(String(k)))vbDB.del(k)})).catch(()=>{})}

/* ---------- cards ---------- */
function vbRing(p,sz){const r=14,c=2*Math.PI*r;return `<svg class="vb-ring" viewBox="0 0 36 36" width="${sz||34}" height="${sz||34}" aria-hidden="true"><circle cx="18" cy="18" r="${r}" class="vb-r0"/><circle cx="18" cy="18" r="${r}" class="vb-r1" stroke-dasharray="${(p*c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 18 18)"/></svg>`}
function vbGoalInner(c){const g=vbGoal(c);if(!g)return `<span class="vb-lbl">Goal</span><b class="vb-gn">${esc(c.t||'A goal')}</b><small class="vb-gs">This goal was removed</small>`;
  const pr=gProg(g),nx=(g.ms||[]).find(m=>!m.done);
  return `${g.done?'<span class="vb-stamp">Achieved</span>':''}<span class="vb-gh"><span class="vb-lbl">Goal</span>${g.done?'':vbRing(pr.p)}</span><b class="vb-gn">${esc(g.name)}</b>
    <small class="vb-gs">${g.done?'Done. Well done.':nx?`Next: ${esc(nx.t)}`:`${pr.n} of ${pr.of} milestones`}</small>`}
function vbCardHTML(c,i){const sz=c.size||'m',cap=(c.t||'').trim(),gl=vbGoal(c);
  const a=`data-vbe="${c.id}" data-vbi="${i}" draggable="true"`;
  if(c.k==='photo'){const u=vbImg[c.id];vbLoad([c]);
    return `<button class="vb-c vb-photo sz-${sz}" ${a} aria-label="${esc(cap||'Photo')}${gl?`, goal ${esc(gl.name)}`:''}">${u?`<img src="${u}" alt="">`:u===''?`<span class="vb-miss">${VB_ICON}<small>Photo is on another device</small></span>`:'<span class="vb-load"></span>'}
      ${cap?`<span class="vb-cap">${esc(cap)}</span>`:''}${gl?`<span class="vb-gb">${gl.done?'✓':vbRing(gProg(gl).p,22)}</span>`:''}</button>`}
  if(c.k==='quote')return `<button class="vb-c vb-quote sz-${sz}" ${a} style="--vc:${esc(c.c||VB_COLORS[0])}"><span class="vb-qt">“${esc(cap)}”</span></button>`;
  if(c.k==='word')return `<button class="vb-c vb-word" ${a}><span class="vb-lbl">Word of the year</span><span class="vb-w">${esc(cap)}</span></button>`;
  return `<button class="vb-c vb-goal${vbGoal(c)&&vbGoal(c).done?' won':''}" ${a}>${vbGoalInner(c)}</button>`}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg vb-pg" id="visionPg" role="region" aria-label="Vision board"><div class="ib-in" id="vbIn"></div></div>');
function vbSummary(cs){const w=vbWord(vbYear);return `${w?`Word of the year: <b class="vb-wd">${esc(w)}</b> · `:''}${cs.length} card${cs.length===1?'':'s'}`}
function drawVision(){if(!vbOn)return;const pg=$('visionPg'),y=pg.scrollTop,cs=vbCards(vbYear),vis=vbArea?cs.filter(c=>c.area===vbArea):cs,desk=vbDesk();
  const yrs=vbYears().map(v=>`<option value="${v}"${v===vbYear?' selected':''}>${v} board</option>`).join('');
  const tools=`<div class="vb-tools"><label class="vb-yr"><span class="sr">Year</span><select id="vbYear" aria-label="Which year">${yrs}<option value="next">New board for ${vbYears().slice(-1)[0]+1}</option></select></label>
    <button class="vb-tb" data-vbplay ${cs.length?'':'disabled'} aria-label="Morning look">${VB_PLAY}${desk?'<span>Morning look</span>':''}</button>
    <button class="vb-tb" data-vbwall ${cs.length?'':'disabled'} aria-label="Save as wallpaper">${VB_DL}${desk?'<span>Save as wallpaper</span>':''}</button>
    ${desk?`<button class="vb-tb vb-add" data-vbnew>${PLUS_S}<span>Add card</span></button>`:''}</div>`;
  const areas=vbAreas(),chips=`<div class="vb-chips" role="group" aria-label="Areas"><button class="vb-chip${vbArea?'':' on'}" data-vbarea="" aria-pressed="${!vbArea}">All</button>${areas.map(a=>`<button class="vb-chip${vbArea===a?' on':''}" data-vbarea="${esc(a)}" aria-pressed="${vbArea===a}">${esc(a)}</button>`).join('')}
    ${vbAddArea?`<input class="vb-chip vb-ain" id="vbAreaIn" maxlength="18" placeholder="New area" aria-label="New area name">`:areas.length<8?'<button class="vb-chip vb-anew" data-vbareanew>+ Area</button>':''}</div>`;
  const empty=!cs.length?`<div class="vb-empty"><b>Picture the year you want</b><span>Add photos of places, people and things you're working towards. One quote, one word for the year.</span>
      <div class="vb-starts"><button data-vbnew="photo">${VB_ICON}Add a photo</button><button data-vbnew="quote">“ Add a quote</button><button data-vbnew="word">Aa Word of the year</button></div></div>`
    :!vis.length?`<p class="vb-none">Nothing in ${esc(vbArea)} yet.</p>`:'';
  const add=cs.length&&cs.length<VB_MAX?`<button class="vb-c vb-addc" data-vbnew>${PLUS_S}Add a card</button>`:'';
  $('vbIn').innerHTML=`<div class="set-top ib-top"><button class="icon-btn" id="vbBack" aria-label="Back">${BACK_SVG}</button>${tools}</div>
    <div class="vb-head"><span class="pg-eye">Your ${vbYear}</span><h1 class="ib-h">Vision</h1><div class="pg-sum">${vbSummary(cs)}</div></div>
    ${cs.length?chips:''}${empty}${vis.length?`<div class="vb-grid" id="vbGrid">${vis.map(vbCardHTML).join('')}${add}</div>`:''}
    ${cs.length>=VB_MAX?`<p class="vb-none">${VB_MAX} cards is the most for one board, so it stays clear. Remove one to add another.</p>`:''}`;
  pg.scrollTop=y;if(vbAddArea){const i=$('vbAreaIn');if(i)i.focus()}}
function vbCloseOthers(){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();
  if(typeof wnOn!=='undefined'&&wnOn)closeWins();if(typeof rtOn!=='undefined'&&rtOn)closeRoutines();if(typeof pnOn!=='undefined'&&pnOn)closePlan();if(typeof jrOn!=='undefined'&&jrOn)closeJournal();if(typeof closeSearch==='function')closeSearch()}
function openVision(){if(!visionOn())return;vbCloseOthers();vbOn=true;vbArea='';vbAddArea=false;drawVision();vbClean();
  $('visionPg').classList.add('on');document.body.classList.add('ib-open');$('visionPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeVision(){if(!vbOn)return;vbOn=false;$('visionPg').classList.remove('on');
  if(!ibOn&&!rhOn&&!(typeof wnOn!=='undefined'&&wnOn)&&!(typeof rtOn!=='undefined'&&rtOn)&&!(typeof pnOn!=='undefined'&&pnOn)&&!(typeof jrOn!=='undefined'&&jrOn))document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#visionPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
$('visionPg').addEventListener('click',e=>{
  if(e.target.closest('#vbBack'))return closeVision();
  const ar=e.target.closest('[data-vbarea]');if(ar){vbArea=ar.dataset.vbarea;haptic(4);return drawVision()}
  if(e.target.closest('[data-vbareanew]')){vbAddArea=true;return drawVision()}
  const nw=e.target.closest('[data-vbnew]');if(nw)return openVbCard(null,nw.dataset.vbnew||null);
  if(e.target.closest('[data-vbplay]'))return vbShowOpen();
  if(e.target.closest('[data-vbwall]'))return vbWallpaper();
  const c=e.target.closest('[data-vbe]');if(c)return openVbCard(c.dataset.vbe)});
$('visionPg').addEventListener('change',e=>{if(e.target.id!=='vbYear')return;const v=e.target.value;vbYear=v==='next'?vbYears().slice(-1)[0]+1:+v;vbArea='';haptic(4);drawVision()});
$('visionPg').addEventListener('keydown',e=>{if(e.target.id!=='vbAreaIn')return;e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();vbAddArea=false;return drawVision()}
  if(e.key==='Enter'){e.preventDefault();const v=e.target.value.trim().slice(0,18);vbAddArea=false;
    if(v&&!vbAreas().some(a=>a.toLowerCase()===v.toLowerCase())){S.cfg.vAreas=[...vbAreas(),v];S.cfgU=Date.now();save();vbArea=v}drawVision()}},true);
$('visionPg').addEventListener('focusout',e=>{if(e.target.id==='vbAreaIn'&&vbAddArea){setTimeout(()=>{if(vbAddArea&&document.activeElement.id!=='vbAreaIn'){vbAddArea=false;drawVision()}},120)}});
/* computers: drag a card onto another to move it there */
let vbDrag=null;
$('visionPg').addEventListener('dragstart',e=>{const c=e.target.closest('[data-vbe]');if(!c)return;vbDrag=c.dataset.vbe;c.classList.add('drag');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',vbDrag)}catch(err){}});
$('visionPg').addEventListener('dragover',e=>{if(vbDrag&&e.target.closest('[data-vbe]'))e.preventDefault()});
$('visionPg').addEventListener('drop',e=>{const t=e.target.closest('[data-vbe]');if(!vbDrag||!t)return;e.preventDefault();vbMoveTo(vbDrag,t.dataset.vbe);vbDrag=null});
$('visionPg').addEventListener('dragend',()=>{vbDrag=null;document.querySelectorAll('#visionPg .drag').forEach(x=>x.classList.remove('drag'))});
function vbMoveTo(id,toId){if(String(id)===String(toId))return;const cs=vbCards(vbYear),from=cs.findIndex(c=>String(c.id)===String(id)),to=cs.findIndex(c=>String(c.id)===String(toId));if(from<0||to<0)return;
  commit(()=>{const [m]=cs.splice(from,1);cs.splice(to,0,m);cs.forEach((c,i)=>c.ord=i)},'Moved')}
function vbNudge(id,d){const cs=vbCards(vbYear),i=cs.findIndex(c=>String(c.id)===String(id)),j=i+d;if(i<0||j<0||j>=cs.length)return;vbMoveTo(id,cs[j].id)}

/* ---------- add / edit a card ---------- */
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="vbSheet"><div class="sheet-in">
  <div class="grab"></div><h2 id="vbTitle">Add to your board</h2><div id="vbForm"></div>
  <input type="file" id="vbFile" accept="image/*" hidden>
</div></div>`);
let vbD=null;
function openVbCard(id,kind){const c=id!=null?vbAll().find(x=>String(x.id)===String(id)):null;
  if(!c&&vbCards(vbYear).length>=VB_MAX){haptic([6,40,6]);return toast(`${VB_MAX} cards is the most for one board. Remove one first.`)}
  vbE=c?c.id:null;vbD=c?{...c,img:vbImg[c.id]||null}:{k:kind||'photo',t:'',area:vbArea||'',size:'m',c:VB_COLORS[0],g:null,img:null};
  if(!c&&vbD.k==='word'&&vbWord(vbYear))vbD.k='photo';
  $('vbTitle').textContent=c?'Edit card':'Add to your board';drawVbForm();openSheet('vbSheet');
  setTimeout(()=>{const i=$('vbText');if($('vbSheet').classList.contains('on')&&i&&!c)i.focus()},300)}
function drawVbForm(){const d=vbD,isNew=vbE==null,gs=(S.goals||[]),gOn=typeof goalsOn==='function'&&goalsOn();
  const kinds=isNew?`<div class="vb-kinds" role="group" aria-label="Kind of card">${VB_KINDS.map(([k,n])=>`<button class="vb-k${d.k===k?' on':''}" data-vbk="${k}" aria-pressed="${d.k===k}"${k==='word'&&vbWord(vbYear)?' disabled title="You already have a word for this year"':''}>${n}</button>`).join('')}</div>`:'';
  let body='';
  if(d.k==='photo')body=`<button class="vb-pick${d.img?' has':''}" data-vbpick aria-label="${d.img?'Change photo':'Choose a photo'}">${d.img?`<img src="${d.img}" alt=""><span class="vb-pk">Change photo</span>`:`${VB_ICON}<b>Choose a photo</b><small>From your phone or computer</small>`}</button>
    ${d.img?`<small class="vb-kb">Shrunk to ${Math.round(d.img.length*.75/1024)} KB · saved on this device</small>`:''}
    <label class="vb-l" for="vbText">Caption</label><input class="field" id="vbText" maxlength="60" placeholder="Climb Kilimanjaro" value="${esc(d.t)}">`;
  if(d.k==='quote')body=`<label class="vb-l" for="vbText">Quote or affirmation</label><textarea class="field vb-ta" id="vbText" rows="3" maxlength="140" placeholder="Small steps, every day.">${esc(d.t)}</textarea>
    <span class="vb-l">Colour</span><div class="vb-sw" role="group" aria-label="Colour">${VB_COLORS.map(c=>`<button class="${d.c===c?'on':''}" data-vbc="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${d.c===c}"></button>`).join('')}</div>`;
  if(d.k==='word')body=`<label class="vb-l" for="vbText">One word for ${vbYear}</label><input class="field vb-wi" id="vbText" maxlength="18" placeholder="Brave" value="${esc(d.t)}">`;
  if(d.k==='goal')body=!gOn?`<p class="vb-note">Turn on Goals in Settings → Modes to put a goal on your board.</p>`:!gs.length?`<p class="vb-note">You have no goals yet. Make a photo card first, then tap “Also make it a goal”.</p>`
    :`<span class="vb-l">Which goal?</span><div class="vb-gl">${gs.map(g=>`<button class="vb-go${String(d.g)===String(g.id)?' on':''}" data-vbg="${g.id}" aria-pressed="${String(d.g)===String(g.id)}">${g.e?esc(g.e)+' ':''}${esc(g.name)}${g.done?' <small>· achieved</small>':''}</button>`).join('')}</div>`;
  const opts=d.k==='word'||d.k==='goal'?'':`<div class="vb-row"><div><span class="vb-l">Size</span><div class="vb-seg" role="group" aria-label="Size">${['s','m','l'].map(z=>`<button class="${d.size===z?'on':''}" data-vbsz="${z}" aria-pressed="${d.size===z}">${z.toUpperCase()}</button>`).join('')}</div></div></div>`;
  const area=`<label class="vb-l" for="vbAreaSel">Area</label><select class="field" id="vbAreaSel"><option value="">No area</option>${vbAreas().map(a=>`<option${d.area===a?' selected':''}>${esc(a)}</option>`).join('')}</select>`;
  const ok=d.k==='photo'?!!d.img:d.k==='goal'?d.g!=null:!!d.t.trim();
  const mk=gOn&&(d.k==='photo'||d.k==='quote')&&!vbGoal(d)?`<button class="le-btn vb-mk" data-vbmk ${d.t.trim()?'':'disabled'}>◎ Also make it a goal</button>`:'';
  const ed=isNew?'':`<div class="vb-move"><button class="le-btn" data-vbmv="-1">← Move earlier</button><button class="le-btn" data-vbmv="1">Move later →</button></div><div class="le-acts"><button class="le-btn warn" data-vbdel>Delete card</button></div>`;
  $('vbForm').innerHTML=`${kinds}${body}${opts}${area}<button class="primary vb-save" id="vbSave" ${ok?'':'disabled'}>${isNew?'Add to board':'Save'}</button>${mk}${ed}`}
$('vbSheet').addEventListener('click',e=>{const d=vbD;if(!d)return;
  const k=e.target.closest('[data-vbk]');if(k){d.k=k.dataset.vbk;if(d.k!=='goal')d.g=null;return drawVbForm()}
  if(e.target.closest('[data-vbpick]'))return $('vbFile').click();
  const cl=e.target.closest('[data-vbc]');if(cl){d.c=cl.dataset.vbc;return drawVbForm()}
  const sz=e.target.closest('[data-vbsz]');if(sz){d.size=sz.dataset.vbsz;return drawVbForm()}
  const g=e.target.closest('[data-vbg]');if(g){d.g=g.dataset.vbg;const gg=vbGoal(d);d.t=gg?gg.name:'';return drawVbForm()}
  if(e.target.closest('#vbSave'))return vbSave();
  if(e.target.closest('[data-vbmk]'))return vbMakeGoal();
  const mv=e.target.closest('[data-vbmv]');if(mv){closeSheets();return vbNudge(vbE,+mv.dataset.vbmv)}
  if(e.target.closest('[data-vbdel]')){const id=vbE;closeSheets();return commit(()=>{S.vision=vbAll().filter(c=>String(c.id)!==String(id))},'Card deleted')}});
$('vbSheet').addEventListener('input',e=>{if(!vbD)return;if(e.target.id==='vbText'){vbD.t=e.target.value;const s=$('vbSave'),ok=vbD.k==='photo'?!!vbD.img:vbD.k==='goal'?vbD.g!=null:!!vbD.t.trim();if(s)s.disabled=!ok;const m=$('vbSheet').querySelector('[data-vbmk]');if(m)m.disabled=!vbD.t.trim()}});
$('vbSheet').addEventListener('change',e=>{if(!vbD)return;if(e.target.id==='vbAreaSel')vbD.area=e.target.value});
$('vbSheet').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='vbText'&&e.target.tagName==='INPUT'){e.preventDefault();const s=$('vbSave');if(s&&!s.disabled)vbSave()}});
$('vbFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f||!vbD)return;
  vbShrink(f).then(u=>{vbD.img=u;if(!vbD.t)vbD.t='';drawVbForm()}).catch(err=>toast(err.message||'That photo could not be added'))});
function vbSave(){const d=vbD;if(!d)return;const isNew=vbE==null,id=isNew?newId():vbE;
  const keep=()=>commit(()=>{let c=vbAll().find(x=>String(x.id)===String(id));
      if(!c){c={id,at:Date.now(),year:vbYear,ord:vbCards(vbYear).length};vbAll().push(c)}
      Object.assign(c,{k:d.k,t:(d.t||'').trim().slice(0,140),area:d.area||'',size:d.size||'m',c:d.k==='quote'?d.c:undefined,g:d.g!=null?d.g:null});
      if(c.c===undefined)delete c.c},isNew?'Added to your board':'Saved');
  closeSheets();haptic(6);
  if(d.k==='photo'&&d.img&&d.img!==vbImg[id]){vbImg[id]=d.img;vbDB.put(id,d.img).catch(()=>toast('This browser could not keep the photo. It shows until you close the app.')).then(keep)}else keep()}
/* "Also make it a goal": open the goal setup with the caption; the new goal links back to this card */
let vbPend=null;
function vbMakeGoal(){const d=vbD;if(!d||!d.t.trim())return;const was=new Set((S.goals||[]).map(g=>String(g.id)));
  if((S.goals||[]).length>=(typeof G_MAX!=='undefined'?G_MAX:99)){return toast('You have the most goals at once. Finish one first.')}
  if(d.k==='photo'&&!d.img)return toast('Choose a photo first');
  vbSave();const id=vbE!=null?vbE:vbAll().slice(-1)[0].id;vbPend={card:id,was};
  setTimeout(()=>{openSetup(null);try{gsD.name=d.t.trim();gsD.touched=true;drawSetup()}catch(e){const i=$('gsName');if(i){i.value=d.t.trim();i.dispatchEvent(new Event('input',{bubbles:true}))}}},350)}
function vbLinkNew(){if(!vbPend)return;const g=(S.goals||[]).find(x=>!vbPend.was.has(String(x.id)));if(!g)return;const c=vbAll().find(x=>String(x.id)===String(vbPend.card));vbPend=null;
  if(c){c.g=g.id;save();toast('Linked: the card now shows this goal\'s progress')}}

/* ---------- Morning look: a full-screen slideshow ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="vb-show" id="vbShow" role="dialog" aria-modal="true" aria-label="Morning look"></div>');
let vbS=null;
function vbShowOpen(){const cs=vbCards(vbYear).filter(c=>!vbArea||c.area===vbArea);if(!cs.length)return;vbS={cs,i:0,paused:false,t0:Date.now(),left:6000,tm:null};
  $('vbShow').classList.add('on');document.body.classList.add('vb-showing');vbSlide();haptic(5)}
function vbShowClose(){if(!vbS)return;clearTimeout(vbS.tm);vbS=null;$('vbShow').classList.remove('on');document.body.classList.remove('vb-showing');$('vbShow').innerHTML=''}
function vbSlide(){if(!vbS)return;const {cs,i}=vbS,c=cs[i],u=c.k==='photo'?vbImg[c.id]:null,g=vbGoal(c);
  const bars=cs.map((x,j)=>`<i class="${j<i?'done':j===i?(vbS.paused?'now paused':'now'):''}"></i>`).join('');
  const art=c.k==='photo'?(u?`<img class="vb-sbg" src="${u}" alt="">`:''):c.k==='quote'?`<div class="vb-sq" style="--vc:${esc(c.c||VB_COLORS[0])}"></div>`:'';
  const main=c.k==='quote'?`<div class="vb-sqt">“${esc(c.t)}”</div>`:c.k==='word'?`<div class="vb-sw2"><small>Word of the year</small><b>${esc(c.t)}</b></div>`
    :`<div class="vb-sc">${c.area?`<span class="vb-sa">${esc(c.area)}</span>`:''}<b>${esc(c.k==='goal'&&g?g.name:c.t||'')}</b>${g?`<small>${g.done?'Achieved':`${gProg(g).n} of ${gProg(g).of} milestones`} · ${esc(g.name)}</small>`:''}</div>`;
  $('vbShow').className='vb-show on k-'+c.k;
  $('vbShow').innerHTML=`${art}<div class="vb-shade"></div><div class="vb-bars">${bars}</div>
    <div class="vb-top"><span>Morning look · ${i+1} of ${cs.length}</span><button class="vb-x" data-vbsx aria-label="Close">✕</button></div>${main}
    <div class="vb-sbtn"><button data-vbsp>${vbS.paused?'▶  Play':'❚❚  Pause'}</button><button class="go" data-vbsn>${i===cs.length-1?'Done':'I see it → next'}</button></div>`;
  clearTimeout(vbS.tm);if(!vbS.paused)vbS.tm=setTimeout(vbNext,6000)}
function vbNext(){if(!vbS)return;if(vbS.i>=vbS.cs.length-1)return vbShowClose();vbS.i++;vbSlide()}
$('vbShow').addEventListener('click',e=>{if(!vbS)return;if(e.target.closest('[data-vbsx]'))return vbShowClose();
  if(e.target.closest('[data-vbsn]'))return vbNext();if(e.target.closest('[data-vbsp]')){vbS.paused=!vbS.paused;return vbSlide()}});
window.addEventListener('keydown',e=>{if(!vbS)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();vbShowClose()}
  else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();vbNext()}else if(e.key==='ArrowLeft'){e.preventDefault();if(vbS.i>0){vbS.i--;vbSlide()}}},true);

/* ---------- Save as wallpaper: a phone-sized picture of the board ---------- */
function vbWrap(ctx,t,x,y,w,lh,max){const words=String(t).split(/\s+/);let line='',n=0;for(const wd of words){const tt=line?line+' '+wd:wd;if(ctx.measureText(tt).width>w&&line){ctx.fillText(line,x,y+n*lh);n++;line=wd;if(n>=max)return}else line=tt}if(line&&n<max)ctx.fillText(line,x,y+n*lh)}
function vbWallpaper(){const cs=vbCards(vbYear).filter(c=>!vbArea||c.area===vbArea);if(!cs.length)return;
  const W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),st=getComputedStyle(root);
  const col=v=>st.getPropertyValue(v).trim()||'#888',font=(st.getPropertyValue('--font')||'sans-serif').trim();
  x.fillStyle=col('--bg');x.fillRect(0,0,W,H);x.fillStyle=col('--muted');x.font=`700 34px ${font}`;x.fillText(`MY ${vbYear}`,72,150);
  x.fillStyle=col('--text');x.font=`800 110px ${font}`;x.fillText(vbWord(vbYear)||'Vision',72,270);
  const g=24,cw=(W-144-g)/2,cols=[330,330],rr=(px,py,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(px,py,w,h,r):x.rect(px,py,w,h)};
  const imgs=cs.map(c=>c.k==='photo'&&vbImg[c.id]?new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=vbImg[c.id]}):Promise.resolve(null));
  Promise.all(imgs).then(ims=>{cs.forEach((c,i)=>{if(c.k==='word')return;const k=cols[0]<=cols[1]?0:1,px=72+k*(cw+g),py=cols[k];const h=c.k==='photo'?({s:300,m:420,l:560}[c.size||'m']):c.k==='quote'?300:240;
      if(py+h>H-80)return;x.save();rr(px,py,cw,h,36);x.clip();
      if(c.k==='photo'){const im=ims[i];x.fillStyle=col('--surface2');x.fillRect(px,py,cw,h);if(im){const s=Math.max(cw/im.width,h/im.height),iw=im.width*s,ih=im.height*s;x.drawImage(im,px+(cw-iw)/2,py+(h-ih)/2,iw,ih)}
        if(c.t){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(px,py+h-90,cw,90);x.fillStyle='#fff';x.font=`700 34px ${font}`;vbWrap(x,c.t,px+28,py+h-34,cw-56,40,1)}}
      else if(c.k==='quote'){x.fillStyle=c.c||VB_COLORS[0];x.fillRect(px,py,cw,h);x.fillStyle='#14100E';x.font=`700 44px ${font}`;vbWrap(x,`“${c.t}”`,px+32,py+76,cw-64,54,4)}
      else{const gg=vbGoal(c);x.fillStyle=col('--surface');x.fillRect(px,py,cw,h);x.fillStyle=col('--muted');x.font=`700 26px ${font}`;x.fillText('GOAL',px+32,py+60);
        x.fillStyle=col('--text');x.font=`800 40px ${font}`;vbWrap(x,gg?gg.name:c.t,px+32,py+120,cw-64,48,2);if(gg){x.fillStyle=col('--today');x.fillRect(px+32,py+h-50,(cw-64)*gProg(gg).p,10)}}
      x.restore();cols[k]+=h+g});
    cv.toBlob(b=>{if(!b)return toast('Could not make the picture');const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`vision-${vbYear}.png`;document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);toast('Saved. Set it as your lock screen')},'image/png')})}

/* ---------- Home: today's vision (one card a day) ---------- */
function vbToday(){if(!visionOn())return null;const cs=vbCards(new Date().getFullYear()).filter(c=>c.k!=='goal');if(!cs.length)return null;
  const n=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);return cs[n%cs.length]}
function vbHomeHTML(c){const u=c.k==='photo'?vbImg[c.id]:null;if(c.k==='photo')vbLoad([c]);
  return `<section class="vb-home k-${c.k}" style="--vc:${esc(c.c||VB_COLORS[0])}" aria-label="Today's vision">${u?`<img src="${u}" alt="">`:''}<div class="vb-hs"></div>
    <span class="vb-ht">Today's vision</span><div class="vb-hb"><b>${c.k==='quote'?`“${esc(c.t)}”`:esc(c.t||'')}</b><button data-vbopen>Open board</button></div></section>`}
function vbHomePaint(force){const c=vbToday();document.querySelectorAll('.vb-home').forEach(x=>{if(force||!c)x.remove()});if(!c)return;
  const ph=document.querySelector('#homeView .td-card');if(ph&&!document.querySelector('#homeView .vb-home'))ph.insertAdjacentHTML('afterend',vbHomeHTML(c));
  const dk=document.querySelector('#dHome .cm-up');if(dk&&!document.querySelector('#dHome .vb-home'))dk.insertAdjacentHTML('afterend',vbHomeHTML(c))}
document.addEventListener('click',e=>{if(!e.target.closest('[data-vbopen]'))return;e.stopPropagation();openVision()},true);

/* every draw: keep the page and Home's card fresh; link a goal made from a card */
const _vbRender=render;render=function(d){_vbRender(d);try{vbLinkNew();vbHomePaint();if(vbOn){if(!visionOn())closeVision();else if(!document.activeElement||!document.activeElement.closest||!document.activeElement.closest('#vbAreaIn'))drawVision()}}catch(err){console.error(err)}};
const _vbDeskR=renderDesk;renderDesk=function(){_vbDeskR.apply(this,arguments);try{vbHomePaint();if(vbOn){const h=$('sHome');if(h)h.classList.remove('on')}}catch(e){}};

/* ---------- computers: "Vision" under Modes in the sidebar ---------- */
const _vbSide=rhythmSide;
rhythmSide=function(){const h=_vbSide();if(!visionOn())return h;
  const it=`<button class="s-list s-home s-inbox ${vbOn?'on':''}" id="sVision" title="Vision board">${VB_ICON}<span class="s-name">Vision</span></button>`;
  return h?h+it:`<div class="s-lbl2"><span class="s-name">Modes</span></div>${it}`};
$('sLists').addEventListener('click',e=>{
  if(e.target.closest('#sVision')){e.stopImmediatePropagation();return vbOn?closeVision():openVision()}
  if(vbOn&&e.target.closest('#sHome,#sAll,[data-sp],#sNewSp,[data-l],#sInbox,#sRhythm,#sGoals,[data-sgoal],[data-sgnew],#sMetrics,#sWins,#sRoutines,#sPlan,#sJournal'))closeVision()},true);
for(const fn of ['openInbox','openRhythm','openGoals','openGoal','goHome','openSpaceSide','openMetrics','openWins','openRoutines','openPlan','openJournal']){const f=window[fn];if(typeof f!=='function')continue;
  window[fn]=function(){if(vbOn)closeVision();return f.apply(this,arguments)}}
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!vbOn||vbS||e.defaultPrevented||$('dlg').classList.contains('on')||document.querySelector('.sheet.on,.cx-pop.on'))return;
  if(e.target&&e.target.closest&&e.target.closest('#visionPg input,#visionPg select'))return;if(!vbDesk())return;e.preventDefault();closeVision()});
ESC_PAGES.visionPg=()=>closeVision();

/* ---------- phones: a Vision tab ---------- */
TB_I.vision=VB_ICON;
const _vbTabs=tabsList;
tabsList=function(){let t=_vbTabs();if(!visionOn())return t;t=t.length?t:[['home','Home',TB_HOME]];t.push(['vision','Vision',VB_ICON]);return t};
const _vbTabNow=tabNow;tabNow=function(){return vbOn?'vision':_vbTabNow()};
const _vbTbGo=tbGo;
tbGo=function(k){if(k==='vision'){if(vbOn){$('visionPg').scrollTo({top:0,behavior:'smooth'});return}_vbTbGo('home');openVision();return drawTabs()}
  if(vbOn)closeVision();return _vbTbGo(k)};
/* the + while on the board adds a card */
document.addEventListener('click',e=>{if(!vbOn||!e.target.closest('#tbAdd,#addBtn,#nwFab'))return;e.preventDefault();e.stopImmediatePropagation();openVbCard(null)},true);
const _vbApply=applySettings;applySettings=function(){_vbApply.apply(this,arguments);if(vbOn&&!visionOn())closeVision()};

/* ---------- Settings → Modes: a Vision board card ---------- */
const _vbModes=modesPage;
modesPage=function(){const h=_vbModes.apply(this,arguments),on=visionOn();
  const card=`<div class="md-card${on?' on':''}" data-md="vision"><div class="md-head"><span class="md-ic">${VB_ICON}</span><span class="md-t"><b>Vision board</b><small>Photos, a quote and a word for your year</small></span>${tg('vision')}</div>
    ${on?`<div class="md-body"><p class="md-note">A board per year with a Morning look slideshow, a vision on Home each day, and a wallpaper you can save. Photos stay on this device.</p></div>`:''}</div>`;
  return h+card};
