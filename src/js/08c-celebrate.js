/* ---------- celebrations (optional, Settings → Tasks): a short, quiet moment after every 1 or 3 finished tasks ---------- */
const CELEBS=[
  {id:'halo',name:'Halo',d:'Soft rings of light open from the task you finished.'},
  {id:'count',name:'Count',d:'Your number for today, big and bold, then gone.'},
  {id:'aurora',name:'Aurora',d:'A calm glow rises from the bottom of the screen.'},
  {id:'orbit',name:'Orbit',d:'A thin line of light runs once around the screen.'}
];
const celebOf=()=>CELEBS.find(c=>c.id===S.cfg.celebStyle)||CELEBS[0];
const doneToday=()=>S.tasks.filter(t=>t.doneAt&&dkey(t.doneAt)===today()).length;
const celebLine=n=>n===1?'First one done today':n%10===0?`${n} done today. What a day.`:`${n} done today`;
let celebT=null;
/* x,y: where the task was ticked (Halo starts there) */
function celebrate(n,x,y,styleId){
  const st=CELEBS.find(c=>c.id===styleId)||celebOf();
  let el=$('celeb');if(el)el.remove();clearTimeout(celebT);
  el=document.createElement('div');el.id='celeb';el.className='celeb c-'+st.id;el.setAttribute('aria-live','polite');
  const W=innerWidth,H=innerHeight;x=x==null?W/2:x;y=y==null?H/2:y;
  const pill=`<div class="cb-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${esc(celebLine(n))}</div>`;
  if(st.id==='halo')el.innerHTML=`<div class="cb-halo" style="left:${x}px;top:${y}px"><i></i><i></i><i></i></div>${pill}`;
  if(st.id==='count')el.innerHTML=`<div class="cb-count"><b>${n}</b><span>${n===1?'task done today':'tasks done today'}</span></div>`;
  if(st.id==='aurora')el.innerHTML=`<div class="cb-aurora"><i></i><i></i><i></i></div>${pill}`;
  if(st.id==='orbit'){const r=Math.min(28,W*.04);
    el.innerHTML=`<svg class="cb-orbit" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect x="3" y="3" width="${W-6}" height="${H-6}" rx="${r}" pathLength="100"/></svg>${pill}`}
  document.body.appendChild(el);
  sfxCeleb(st.id);
  celebT=setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),500)},st.id==='count'?1500:1900);
}
/* called when a task is finished by the person (never by sync or startup) */
function maybeCelebrate(){
  if(!S.cfg.celebrate)return;
  if($('focus').classList.contains('on')||(typeof tideOn==='function'&&tideOn()))return; // focus has its own finish
  const n=doneToday(),every=+S.cfg.celebEvery||3;if(!n||n%every)return;
  celebrate(n,sfxPt&&sfxPt.x,sfxPt&&sfxPt.y);
}
