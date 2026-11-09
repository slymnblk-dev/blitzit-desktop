/* ---------- Vision board (optional mode, Settings → Modes, 0.309) ----------
   A board per year of photos, quotes, a word of the year and goal cards, in a masonry grid.
   Cards live in S.vision: {id, k:'photo'|'quote'|'word'|'goal', t:text/caption, g:goal id, area, size:'s'|'m'|'l', year, c:colour, ord, at}
   — synced, backed up and undoable like the other modes. Photos are big, so they are shrunk (≈80–160 KB) and kept
   on this device only (IndexedDB "wd-vision"); another device shows a calm placeholder until that's added.
   Phones: a Vision tab. Computers: "Vision" under Modes. Morning look: a full-screen slideshow.
   Home shows "Today's vision" (one card a day). */
var vbOn=false,vbYear=new Date().getFullYear(),vbArea='',vbAddArea=false,vbE=null,vbCleaned=false,vbYOpen=false;
function visionOn(){return !!(S.cfg&&S.cfg.vision)}
const VB_MAX=40;
var VB_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/></svg>';
const VB_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const VB_COLORS=['#FF8A5B','#7CE0A8','#8FB4FF','#B98CFF','#F5C77E','#F4F4F5'];
const VB_KINDS=[['photo','Photo'],['art','Art'],['quote','Quote'],['word','Word'],['goal','Goal']];
/* our own flat illustrations (0.311): no stock photos, no copyright worries; they suit both Classic and Flow */
const VB_ART={
  sunrise:['Sunrise','<rect width="300" height="360" fill="#F7D9B6"/><circle cx="150" cy="210" r="62" fill="#FF8A5B"/><path d="M0 230 Q80 190 160 228 T300 214 V360 H0Z" fill="#4E7A5C"/><path d="M0 268 Q90 238 170 266 T300 258 V360 H0Z" fill="#2F4A3A"/>'],
  ocean:['Ocean','<rect width="300" height="360" fill="#BFE3EC"/><circle cx="220" cy="92" r="34" fill="#F5C77E"/><path d="M0 196 Q38 182 75 196 T150 196 T225 196 T300 196 V360 H0Z" fill="#3E7A8C"/><path d="M0 238 Q38 224 75 238 T150 238 T225 238 T300 238 V360 H0Z" fill="#2B5A6E"/><path d="M0 300 Q120 276 300 296 V360 H0Z" fill="#E8D3A6"/>'],
  peak:['Summit','<rect width="300" height="360" fill="#23304A"/><circle cx="62" cy="66" r="2.5" fill="#fff"/><circle cx="118" cy="40" r="2" fill="#fff"/><circle cx="246" cy="58" r="2.5" fill="#fff"/><circle cx="200" cy="96" r="1.8" fill="#fff"/><path d="M-10 360 L110 150 L170 230 L222 128 L320 360Z" fill="#5C6F96"/><path d="M222 128 L244 172 L232 166 L222 180 L210 166 L200 172Z" fill="#F4F4F5"/><path d="M222 128 V92" stroke="#F4F4F5" stroke-width="3"/><path d="M222 92 L250 102 L222 112Z" fill="#FF8A5B"/><path d="M-10 360 L70 250 L140 360Z" fill="#3D4D6E"/>'],
  home:['Home','<rect width="300" height="360" fill="#F4E8DA"/><rect x="78" y="168" width="144" height="122" rx="6" fill="#FF8A5B"/><path d="M60 176 L150 100 L240 176Z" fill="#2A2420"/><rect x="134" y="226" width="34" height="64" rx="4" fill="#2A2420"/><rect x="96" y="196" width="26" height="26" rx="3" fill="#FFE7C2"/><rect x="180" y="196" width="26" height="26" rx="3" fill="#FFE7C2"/><path d="M0 290 H300 V360 H0Z" fill="#7CB08B"/><circle cx="262" cy="270" r="18" fill="#4E7A5C"/><circle cx="40" cy="276" r="14" fill="#4E7A5C"/>'],
  growth:['Growth','<rect width="300" height="360" fill="#E3F3EA"/><path d="M150 250 C150 200 150 170 150 120" stroke="#2F8F5B" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M150 170 C112 168 96 140 100 118 C128 118 148 136 150 170Z" fill="#45B07A"/><path d="M150 140 C186 136 202 108 198 86 C170 88 152 106 150 140Z" fill="#2F8F5B"/><path d="M150 205 C188 206 206 182 204 160 C176 160 154 176 150 205Z" fill="#45B07A"/><path d="M104 248 H196 L186 312 H114Z" fill="#FF8A5B"/><rect x="98" y="240" width="104" height="18" rx="5" fill="#E8744A"/>'],
  books:['Learning','<rect width="300" height="360" fill="#EDE7FB"/><rect x="70" y="262" width="168" height="34" rx="5" fill="#B98CFF"/><rect x="84" y="226" width="150" height="34" rx="5" fill="#FF8A5B"/><rect x="62" y="190" width="160" height="34" rx="5" fill="#3E7A8C"/><rect x="96" y="160" width="128" height="28" rx="5" fill="#F5C77E"/><rect x="70" y="196" width="4" height="22" fill="#fff" opacity=".6"/><path d="M0 296 H300 V360 H0Z" fill="#D9CFF3"/><circle cx="232" cy="96" r="22" fill="#FFB86B"/>'],
  travel:['Travel','<rect width="300" height="360" fill="#DCEBFF"/><ellipse cx="80" cy="250" rx="54" ry="18" fill="#fff"/><ellipse cx="226" cy="120" rx="46" ry="15" fill="#fff"/><path d="M40 300 Q120 240 150 200 T262 92" stroke="#FF8A5B" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" fill="none"/><g transform="translate(232 108) rotate(-38)"><path d="M-30 0 H30 L40 -6 L30 6 H-30Z" fill="#14100E"/><path d="M-4 0 L-22 -28 H-12 L12 0Z" fill="#14100E"/><path d="M-4 0 L-22 28 H-12 L12 0Z" fill="#14100E"/><path d="M-30 0 L-38 -12 H-30 L-22 0Z" fill="#14100E"/></g>'],
  love:['Loved ones','<rect width="300" height="360" fill="#FFE1E6"/><path d="M150 262 C70 210 66 150 104 132 C128 120 146 134 150 150 C154 134 172 120 196 132 C234 150 230 210 150 262Z" fill="#FF6B81"/><path d="M196 104 C176 92 176 72 188 68 C194 66 198 70 199 75 C200 70 204 66 210 68 C222 72 222 92 196 104Z" fill="#FF8A5B"/><circle cx="84" cy="84" r="6" fill="#FF8A5B" opacity=".6"/>']};
const vbArt=(k,cls)=>{const a=VB_ART[k]||VB_ART.sunrise;return `<svg class="${cls||'vb-svg'}" viewBox="0 0 300 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${a[1]}</svg>`};
/* a few lines to start from (our own words) */
const VB_IDEAS=['Small steps, every day.','Start where you are.','Progress over perfection.','Your future is built today.','Calm mind, brave heart.','Make room for what matters.'];
/* the sample board for a first visit; examples carry sample:true and clear in one tap */
const VB_SEED=[{k:'art',a:'sunrise',t:'Wake up with a plan',size:'l',area:'Health'},{k:'quote',t:'Small steps, every day.',c:'#FF8A5B'},{k:'art',a:'ocean',t:'See the ocean',size:'m',area:'Travel'},
  {k:'word',t:'Grow'},{k:'art',a:'home',t:'A calm home',size:'m',area:'Home'},{k:'quote',t:'Calm mind, brave heart.',c:'#B98CFF',size:'s'},{k:'art',a:'books',t:'Learn something new',size:'s',area:'Career'},{k:'art',a:'peak',t:'Reach the top',size:'l',area:'Career'}];
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
  if(c.k==='art')return `<button class="vb-c vb-art sz-${sz}" ${a} aria-label="${esc(cap||(VB_ART[c.a]||VB_ART.sunrise)[0])}">${vbArt(c.a)}${cap?`<span class="vb-cap">${esc(cap)}</span>`:''}${gl?`<span class="vb-gb">${gl.done?'✓':vbRing(gProg(gl).p,22)}</span>`:''}</button>`;
  if(c.k==='quote')return `<button class="vb-c vb-quote sz-${sz}${cap.length>70?' long':''}" ${a} style="--vc:${esc(c.c||VB_COLORS[0])}"><span class="vb-qt">“${esc(cap)}”</span></button>`;
  if(c.k==='word')return `<button class="vb-c vb-word" ${a} style="--n:${Math.max(5,cap.length)}"><span class="vb-lbl">Word of the year</span><span class="vb-w">${esc(cap)}</span></button>`;
  return `<button class="vb-c vb-goal${vbGoal(c)&&vbGoal(c).done?' won':''}" ${a}>${vbGoalInner(c)}</button>`}

/* ---------- the page ---------- */
document.body.insertAdjacentHTML('beforeend','<div class="inbox-pg rh-pg vb-pg" id="visionPg" role="region" aria-label="Vision board"><div class="ib-in" id="vbIn"></div></div>');
function vbSummary(cs){const w=vbWord(vbYear);return `${w?`Word of the year: <b class="vb-wd">${esc(w)}</b> · `:''}${cs.length} card${cs.length===1?'':'s'}`}
function drawVision(){if(!vbOn)return;const pg=$('visionPg'),y=pg.scrollTop,cs=vbCards(vbYear),vis=vbArea?cs.filter(c=>c.area===vbArea):cs,desk=vbDesk();
  const nxt=vbYears().slice(-1)[0]+1,yrs=vbYears().map(v=>`<button role="menuitemradio" aria-checked="${v===vbYear}" class="${v===vbYear?'on':''}" data-vby="${v}"><b>${v}</b><small>${vbCards(v).length} card${vbCards(v).length===1?'':'s'}</small></button>`).join('');
  const yr=`<div class="vb-yw"><button class="vb-yb" id="vbYearBtn" aria-haspopup="menu" aria-expanded="${vbYOpen}">${vbYear} board<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg></button>
    ${vbYOpen?`<div class="vb-ym" role="menu" aria-label="Boards">${yrs}<button class="vb-ynew" data-vby="${nxt}">${PLUS_S}New board for ${nxt}</button></div>`:''}</div>`;
  const tools=`<div class="vb-tools">
    <button class="vb-tb" data-vbplay ${cs.length?'':'disabled'} aria-label="Morning look">${VB_PLAY}${desk?'<span>Morning look</span>':''}</button>
    ${desk?`<button class="vb-tb vb-add" data-vbnew>${PLUS_S}<span>Add card</span></button>`:''}</div>`;
  const areas=vbAreas(),cnt=a=>cs.filter(c=>c.area===a).length,chips=`<div class="vb-chips" role="group" aria-label="Areas"><button class="vb-chip${vbArea?'':' on'}" data-vbarea="" aria-pressed="${!vbArea}">All <em>${cs.length}</em></button>${areas.map(a=>`<span class="vb-cw${vbArea===a?' on':''}"><button class="vb-chip${vbArea===a?' on':''}" data-vbarea="${esc(a)}" aria-pressed="${vbArea===a}">${esc(a)}${cnt(a)?` <em>${cnt(a)}</em>`:''}</button></span>`).join('')}<button class="vb-chip vb-anew" data-vbareas aria-label="Edit areas">${VB_PEN}${areas.length?'Edit':'Add areas'}</button></div>`;
  const empty=!cs.length?`<div class="vb-empty"><b>Picture the year you want</b><span>Add photos of places, people and things you're working towards. One quote, one word for the year.</span>
      <div class="vb-starts"><button data-vbnew="photo">${VB_ICON}Add a photo</button><button data-vbnew="quote">“ Add a quote</button><button data-vbnew="word">Aa Word of the year</button></div></div>`
    :!vis.length?`<p class="vb-none">Nothing in ${esc(vbArea)} yet.</p>`:'';
  const ex=cs.some(c=>c.sample)?`<div class="vb-exb"><span><b>Examples to get you started.</b> Tap any card to make it yours.</span><button data-vbclear>Clear examples</button></div>`:'';
  const add=cs.length&&cs.length<VB_MAX?`<button class="vb-c vb-addc" data-vbnew>${PLUS_S}Add a card</button>`:'';
  $('vbIn').innerHTML=`<div class="set-top ib-top vb-top0"><button class="icon-btn" id="vbBack" aria-label="Back">${BACK_SVG}</button>${yr}${tools}</div>
    <div class="vb-head"><h1 class="ib-h">Vision</h1><div class="pg-sum">${vbSummary(cs)}</div></div>
    ${ex}${cs.length?chips:''}${empty}${vis.length?`<div class="vb-grid" id="vbGrid">${vis.map(vbCardHTML).join('')}${add}</div>`:''}
    ${cs.length>=VB_MAX?`<p class="vb-none">${VB_MAX} cards is the most for one board, so it stays clear. Remove one to add another.</p>`:''}`;
  pg.scrollTop=y;if(vbAddArea){const i=$('vbAreaIn');if(i)i.focus()}}
function vbCloseOthers(){if(ibOn)closeInbox();if(rhOn)closeRhythm();if(glOn)closeGoals();if(typeof gdOn!=='undefined'&&gdOn)closeGoal();if(typeof mtOn!=='undefined'&&mtOn)closeMetrics();
  if(typeof wnOn!=='undefined'&&wnOn)closeWins();if(typeof rtOn!=='undefined'&&rtOn)closeRoutines();if(typeof pnOn!=='undefined'&&pnOn)closePlan();if(typeof jrOn!=='undefined'&&jrOn)closeJournal();if(typeof closeSearch==='function')closeSearch()}
function vbSeed(){if(S.cfg.vSeeded||vbAll().length)return;S.cfg.vSeeded=1;S.cfgU=Date.now();const y=new Date().getFullYear(),t=Date.now();
  VB_SEED.forEach((x,i)=>vbAll().push({id:newId(),at:t+i,year:y,ord:i,size:'m',area:'',...x,sample:true}));save()}
function openVision(){if(!visionOn())return;vbCloseOthers();vbSeed();vbOn=true;vbArea='';vbYOpen=false;vbAddArea=false;drawVision();vbClean();
  $('visionPg').classList.add('on');document.body.classList.add('ib-open');$('visionPg').scrollTop=0;haptic(5);if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
function closeVision(){if(!vbOn)return;vbOn=false;$('visionPg').classList.remove('on');
  if(!ibOn&&!rhOn&&!(typeof wnOn!=='undefined'&&wnOn)&&!(typeof rtOn!=='undefined'&&rtOn)&&!(typeof pnOn!=='undefined'&&pnOn)&&!(typeof jrOn!=='undefined'&&jrOn))document.body.classList.remove('ib-open');
  const a=document.activeElement;if(a&&a.closest&&a.closest('#visionPg'))a.blur();if(typeof renderDesk==='function')renderDesk();try{drawTabs()}catch(e){}}
$('visionPg').addEventListener('click',e=>{
  if(e.target.closest('#vbBack'))return closeVision();
  if(e.target.closest('#vbYearBtn')){vbYOpen=!vbYOpen;haptic(4);return drawVision()}
  const yb=e.target.closest('[data-vby]');if(yb){vbYear=+yb.dataset.vby;vbYOpen=false;vbArea='';haptic(4);return drawVision()}
  if(vbYOpen&&!e.target.closest('.vb-ym')){vbYOpen=false;drawVision()}
  const ad=e.target.closest('[data-vbadel]');if(ad)return vbDelArea(ad.dataset.vbadel);
  const ar=e.target.closest('[data-vbarea]');if(ar){vbArea=ar.dataset.vbarea;haptic(4);return drawVision()}
  if(e.target.closest('[data-vbareas]'))return openVbAreas();
  if(e.target.closest('[data-vbclear]')){vbArea='';return commit(()=>{S.vision=vbAll().filter(c=>!c.sample)},'Examples cleared')}
  const nw=e.target.closest('[data-vbnew]');if(nw)return openVbCard(null,nw.dataset.vbnew||null);
  if(e.target.closest('[data-vbplay]'))return vbShowOpen();
  const c=e.target.closest('[data-vbe]');if(c)return openVbCard(c.dataset.vbe)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&vbYOpen&&vbOn){e.preventDefault();e.stopPropagation();vbYOpen=false;drawVision();const b=$('vbYearBtn');if(b)b.focus()}},true);
$('visionPg').addEventListener('keydown',e=>{if(e.target.id!=='vbAreaIn')return;e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();vbAddArea=false;return drawVision()}
  if(e.key==='Enter'){e.preventDefault();const v=e.target.value.trim().slice(0,18);vbAddArea=false;
    if(v&&!vbAreas().some(a=>a.toLowerCase()===v.toLowerCase())){S.cfg.vAreas=[...vbAreas(),v];S.cfgU=Date.now();save();vbArea=v}drawVision()}},true);
$('visionPg').addEventListener('focusout',e=>{if(e.target.id==='vbAreaIn'&&vbAddArea){setTimeout(()=>{if(vbAddArea&&document.activeElement.id!=='vbAreaIn'){vbAddArea=false;drawVision()}},120)}});
/* ---------- life areas: add, rename, remove (a sheet) ---------- */
var VB_PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z"/></svg>';
const VB_BIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
document.body.insertAdjacentHTML('beforeend',`<div class="sheet" id="vbAreaSheet"><div class="sheet-in"><div class="grab"></div><h2>Life areas</h2>
  <p class="sub-p vb-asub">Group your cards by the parts of life they belong to. Rename or remove any of them; cards are never deleted.</p><div id="vbAreaList"></div></div></div>`);
function drawVbAreas(){const as=vbAreas(),cs=vbAll();
  $('vbAreaList').innerHTML=`<div class="vb-alist">${as.map((a,i)=>`<div class="vb-arow"><input class="field" data-vbren="${i}" value="${esc(a)}" maxlength="18" aria-label="Rename ${esc(a)}">
      <small>${cs.filter(c=>c.area===a).length} card${cs.filter(c=>c.area===a).length===1?'':'s'}</small><button class="vb-adel2" data-vbadel="${esc(a)}" aria-label="Remove ${esc(a)}" title="Remove">${VB_BIN}</button></div>`).join('')}</div>
    ${as.length<8?`<div class="vb-anew2"><input class="field" id="vbAreaNew" maxlength="18" placeholder="New area, e.g. Family" aria-label="New area"><button class="primary" data-vbaadd>Add</button></div>`:'<p class="vb-note">8 areas is the most, so the board stays simple.</p>'}`}
function openVbAreas(){drawVbAreas();openSheet('vbAreaSheet');haptic(4)}
function vbAddAreaNamed(v){v=(v||'').trim().slice(0,18);if(!v)return;if(vbAreas().some(a=>a.toLowerCase()===v.toLowerCase()))return toast('You already have that area');
  if(vbAreas().length>=8)return;S.cfg.vAreas=[...vbAreas(),v];S.cfgU=Date.now();save();render();drawVbAreas();const i=$('vbAreaNew');if(i)i.focus()}
function vbRenArea(i,v){v=(v||'').trim().slice(0,18);const as=[...vbAreas()],old=as[i];if(old==null||!v||v===old)return drawVbAreas();
  if(as.some((x,j)=>j!==i&&x.toLowerCase()===v.toLowerCase())){toast('You already have that area');return drawVbAreas()}
  as[i]=v;S.cfg.vAreas=as;S.cfgU=Date.now();vbAll().forEach(c=>{if(c.area===old)c.area=v});if(vbArea===old)vbArea=v;save();render();toast(`Renamed to ${v}`)}
/* areas live in settings (not in the undo history), so this Undo puts both back by hand */
function vbDelArea(a){const was=[...vbAreas()],hit=vbAll().filter(c=>c.area===a);if(vbArea===a)vbArea='';haptic(5);
  S.cfg.vAreas=was.filter(x=>x!==a);S.cfgU=Date.now();hit.forEach(c=>{c.area=''});save();render();if($('vbAreaSheet').classList.contains('on'))drawVbAreas();
  toast(`Removed the area ${a}`,()=>{S.cfg.vAreas=was;S.cfgU=Date.now();hit.forEach(c=>{c.area=a});save();render();if($('vbAreaSheet').classList.contains('on'))drawVbAreas()})}
$('vbAreaSheet').addEventListener('click',e=>{const d=e.target.closest('[data-vbadel]');if(d)return vbDelArea(d.dataset.vbadel);
  if(e.target.closest('[data-vbaadd]'))return vbAddAreaNamed(($('vbAreaNew')||{}).value)});
$('vbAreaSheet').addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target.id==='vbAreaNew'){e.preventDefault();return vbAddAreaNamed(e.target.value)}
  if(e.target.dataset.vbren!=null){e.preventDefault();e.target.blur()}});
$('vbAreaSheet').addEventListener('change',e=>{if(e.target.dataset.vbren!=null)vbRenArea(+e.target.dataset.vbren,e.target.value)});

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
  vbE=c?c.id:null;vbD=c?{...c,img:vbImg[c.id]||null}:{k:kind||'photo',a:null,t:'',area:vbArea||'',size:'m',c:VB_COLORS[0],g:null,img:null};
  if(!c&&vbD.k==='word'&&vbWord(vbYear))vbD.k='photo';
  $('vbTitle').textContent=c?'Edit card':'Add to your board';drawVbForm();openSheet('vbSheet');
  setTimeout(()=>{const i=$('vbText');if($('vbSheet').classList.contains('on')&&i&&!c)i.focus()},300)}
function drawVbForm(){const d=vbD,isNew=vbE==null,gs=(S.goals||[]),gOn=typeof goalsOn==='function'&&goalsOn();
  const kinds=isNew?`<div class="vb-kinds" role="group" aria-label="Kind of card">${VB_KINDS.map(([k,n])=>`<button class="vb-k${d.k===k?' on':''}" data-vbk="${k}" aria-pressed="${d.k===k}"${k==='word'&&vbWord(vbYear)?' disabled title="You already have a word for this year"':''}>${n}</button>`).join('')}</div>`:'';
  let body='';
  if(d.k==='photo')body=`<button class="vb-pick${d.img?' has':''}" data-vbpick aria-label="${d.img?'Change photo':'Choose a photo'}">${d.img?`<img src="${d.img}" alt=""><span class="vb-pk">Change photo</span>`:`${VB_ICON}<b>Choose a photo</b><small>From your phone or computer</small>`}</button>
    ${d.img?`<small class="vb-kb">Shrunk to ${Math.round(d.img.length*.75/1024)} KB · saved on this device</small>`:''}
    <label class="vb-l" for="vbText">Caption</label><input class="field" id="vbText" maxlength="60" placeholder="Climb Kilimanjaro" value="${esc(d.t)}">`;
  if(d.k==='art')body=`<span class="vb-l">Pick an illustration</span><div class="vb-arts" role="group" aria-label="Illustrations">${Object.keys(VB_ART).map(k=>`<button class="vb-at${d.a===k?' on':''}" data-vbart="${k}" aria-pressed="${d.a===k}" aria-label="${VB_ART[k][0]}">${vbArt(k)}<small>${VB_ART[k][0]}</small></button>`).join('')}</div>
    <label class="vb-l" for="vbText">Caption</label><input class="field" id="vbText" maxlength="60" placeholder="What does it stand for?" value="${esc(d.t)}">`;
  if(d.k==='quote')body=`<label class="vb-l" for="vbText">Quote or affirmation</label><textarea class="field vb-ta" id="vbText" rows="3" maxlength="140" placeholder="Write your own, or pick one below">${esc(d.t)}</textarea>
    <div class="vb-ideas" role="group" aria-label="Ideas">${VB_IDEAS.map(q=>`<button data-vbq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <span class="vb-l">Colour</span><div class="vb-sw" role="group" aria-label="Colour">${VB_COLORS.map(c=>`<button class="${d.c===c?'on':''}" data-vbc="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${d.c===c}"></button>`).join('')}</div>`;
  if(d.k==='word')body=`<label class="vb-l" for="vbText">One word for ${vbYear}</label><input class="field vb-wi" id="vbText" maxlength="18" placeholder="Brave" value="${esc(d.t)}">`;
  if(d.k==='goal')body=!gOn?`<p class="vb-note">Turn on Goals in Settings → Modes to put a goal on your board.</p>`:!gs.length?`<p class="vb-note">You have no goals yet. Make a photo card first, then tap “Also make it a goal”.</p>`
    :`<span class="vb-l">Which goal?</span><div class="vb-gl">${gs.map(g=>`<button class="vb-go${String(d.g)===String(g.id)?' on':''}" data-vbg="${g.id}" aria-pressed="${String(d.g)===String(g.id)}">${g.e?esc(g.e)+' ':''}${esc(g.name)}${g.done?' <small>· achieved</small>':''}</button>`).join('')}</div>`;
  const opts=d.k==='word'||d.k==='goal'?'':`<div class="vb-row"><span class="vb-l">Card size</span><div class="vb-seg" role="group" aria-label="Card size">${[['s','Small'],['m','Medium'],['l','Large']].map(([z,n])=>`<button class="${d.size===z?'on':''}" data-vbsz="${z}" aria-pressed="${d.size===z}"><i class="vb-szi z-${z}" aria-hidden="true"></i>${n}</button>`).join('')}</div></div>`;
  const area=`<span class="vb-l">Area</span><div class="vb-ac" role="group" aria-label="Area">${['',...vbAreas()].map(a=>`<button class="${(d.area||'')===a?'on':''}" data-vba="${esc(a)}" aria-pressed="${(d.area||'')===a}">${a?esc(a):'None'}</button>`).join('')}</div>`;
  const ok=d.k==='photo'?!!d.img:d.k==='art'?!!d.a:d.k==='goal'?d.g!=null:!!d.t.trim();
  const mk=gOn&&(d.k==='photo'||d.k==='quote'||d.k==='art')&&!vbGoal(d)?`<button class="le-btn vb-mk" data-vbmk ${d.t.trim()?'':'disabled'}>◎ Also make it a goal</button>`:'';
  const ed=isNew?'':`<div class="vb-move"><button class="le-btn" data-vbmv="-1">← Move earlier</button><button class="le-btn" data-vbmv="1">Move later →</button></div><div class="le-acts"><button class="le-btn warn" data-vbdel>Delete card</button></div>`;
  $('vbForm').innerHTML=`${kinds}${body}${opts}${area}<button class="primary vb-save" id="vbSave" ${ok?'':'disabled'}>${isNew?'Add to board':'Save'}</button>${mk}${ed}`}
$('vbSheet').addEventListener('click',e=>{const d=vbD;if(!d)return;
  const k=e.target.closest('[data-vbk]');if(k&&!k.disabled){const t=$('vbText');if(t)d.t=t.value;d.k=k.dataset.vbk;if(d.k!=='goal')d.g=null;else d.t='';drawVbForm();const i=$('vbText');if(i)i.focus();return}
  if(e.target.closest('[data-vbpick]'))return $('vbFile').click();
  const cl=e.target.closest('[data-vbc]');if(cl){d.c=cl.dataset.vbc;return drawVbForm()}
  const sz=e.target.closest('[data-vbsz]');if(sz){d.size=sz.dataset.vbsz;return drawVbForm()}
  const ar=e.target.closest('[data-vba]');if(ar){d.area=ar.dataset.vba;return drawVbForm()}
  const at=e.target.closest('[data-vbart]');if(at){d.a=at.dataset.vbart;return drawVbForm()}
  const qi=e.target.closest('[data-vbq]');if(qi){d.t=qi.dataset.vbq;return drawVbForm()}
  const g=e.target.closest('[data-vbg]');if(g){d.g=g.dataset.vbg;const gg=vbGoal(d);d.t=gg?gg.name:'';return drawVbForm()}
  if(e.target.closest('#vbSave'))return vbSave();
  if(e.target.closest('[data-vbmk]'))return vbMakeGoal();
  const mv=e.target.closest('[data-vbmv]');if(mv){closeSheets();return vbNudge(vbE,+mv.dataset.vbmv)}
  if(e.target.closest('[data-vbdel]')){const id=vbE;closeSheets();return commit(()=>{S.vision=vbAll().filter(c=>String(c.id)!==String(id))},'Card deleted')}});
$('vbSheet').addEventListener('input',e=>{if(!vbD)return;if(e.target.id==='vbText'){vbD.t=e.target.value;const s=$('vbSave'),ok=vbD.k==='photo'?!!vbD.img:vbD.k==='art'?!!vbD.a:vbD.k==='goal'?vbD.g!=null:!!vbD.t.trim();if(s)s.disabled=!ok;const m=$('vbSheet').querySelector('[data-vbmk]');if(m)m.disabled=!vbD.t.trim()}});
$('vbSheet').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='vbText'&&e.target.tagName==='INPUT'){e.preventDefault();const s=$('vbSave');if(s&&!s.disabled)vbSave()}});
$('vbFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f||!vbD)return;
  vbShrink(f).then(u=>{vbD.img=u;if(!vbD.t)vbD.t='';drawVbForm()}).catch(err=>toast(err.message||'That photo could not be added'))});
function vbSave(){const d=vbD;if(!d)return;const isNew=vbE==null,id=isNew?newId():vbE;
  const keep=()=>commit(()=>{let c=vbAll().find(x=>String(x.id)===String(id));
      if(!c){c={id,at:Date.now(),year:vbYear,ord:vbCards(vbYear).length};vbAll().push(c)}
      delete c.sample;if(d.k==='art')c.a=d.a;else delete c.a;
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
  const art=c.k==='art'?`<div class="vb-sbg vb-sart">${vbArt(c.a)}</div>`:c.k==='photo'?(u?`<img class="vb-sbg" src="${u}" alt="">`:''):c.k==='quote'?`<div class="vb-sq" style="--vc:${esc(c.c||VB_COLORS[0])}"></div>`:'';
  const main=c.k==='quote'?`<div class="vb-sqt">“${esc(c.t)}”</div>`:c.k==='word'?`<div class="vb-sw2" style="--n:${Math.max(5,(c.t||'').length)}"><small>Word of the year</small><b>${esc(c.t)}</b></div>`
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

/* ---------- Home: today's vision (one card a day) ---------- */
function vbToday(){if(!visionOn())return null;const cs=vbCards(new Date().getFullYear()).filter(c=>c.k!=='goal');if(!cs.length)return null;
  const n=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);return cs[n%cs.length]}
function vbHomeHTML(c){const u=c.k==='photo'?vbImg[c.id]:null;if(c.k==='photo')vbLoad([c]);
  if(c.k==='art')return `<section class="vb-home k-art" aria-label="Today's vision">${vbArt(c.a,'vb-hsvg')}<div class="vb-hs"></div>
    <span class="vb-ht">Today's vision</span><div class="vb-hb"><b>${esc(c.t||VB_ART[c.a]?.[0]||'')}</b><button data-vbopen>Open board</button></div></section>`;
  return `<section class="vb-home k-${c.k}" style="--vc:${esc(c.c||VB_COLORS[0])};--n:${Math.max(5,(c.t||'').length)}" aria-label="Today's vision">${u?`<img src="${u}" alt="">`:''}<div class="vb-hs"></div>
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
    ${on?`<div class="md-body"><p class="md-note">A board per year with a Morning look slideshow and a vision on Home each day. Photos stay on this device.</p></div>`:''}</div>`;
  return h+card};
