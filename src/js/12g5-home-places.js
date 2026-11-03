/* ---------- Computer Home: your spaces and lists in one quiet row (0.284) ----------
   Spaces are rounded tiles (icon or first letter, "3 today · 2 lists"); lists without a space are outlined pills with a dot,
   after a thin divider. Nothing to show → nothing at all (no label, no empty state). No "New space" pill: the + does that.
   Replaces the old chips row on both computer Home layouts (Calm column and Bento). Clicks: [data-space] (existing) and [data-loose] (12g). */
function hmPlaces(){
  const sps=orderedSpaces(),lo=looseLists();if(!sps.length&&!lo.length)return '';
  const tile=sp=>{const st=spaceStats(sp),n=st.lists;
    return `<button class="hp-sp" data-space="${sp.id}" style="--sc:${sp.c}" title="${esc(sp.name)} · space"><span class="hp-ic">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><b>${esc(sp.name)}</b><small>${st.today?`${st.today} today`:`${st.open} open`} · ${n} ${n===1?'list':'lists'}</small></button>`};
  const pill=l=>`<button class="hp-ls" data-loose="${l.id}" title="${esc(l.name)} · list"><i style="background:${l.c}"></i><b>${esc(l.name)}</b><small>${nwOpenN(l.id)} open</small></button>`;
  const eye=sps.length&&lo.length?'Your spaces & lists':sps.length?'Your spaces':'Your lists';
  return `<div class="hp"><div class="hp-eye">${eye}</div><div class="hp-row">${sps.map(tile).join('')}${sps.length&&lo.length?'<span class="hp-dv" aria-hidden="true"></span>':''}${lo.map(pill).join('')}</div></div>`;
}
const _hpRender=render;
render=function(){const r=_hpRender.apply(this,arguments);
  try{document.querySelectorAll('#dHome .cm-sps,#dHome .bn-sps').forEach(el=>{el.outerHTML=hmPlaces()});hpDivider()}catch(e){}return r};
/* the thin divider only shows between a space and a list on the same line; when the lists wrap to a new line it hides */
function hpDivider(){document.querySelectorAll('#dHome .hp-dv').forEach(d=>{d.style.display='';const p=d.previousElementSibling,n=d.nextElementSibling;
  d.style.display=p&&n&&p.offsetTop===n.offsetTop?'':'none'})}
addEventListener('resize',()=>{try{hpDivider()}catch(e){}});
