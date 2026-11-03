/* ---------- Computer Home: your spaces and lists in one quiet row (0.284) ----------
   Spaces are rounded tiles (icon or first letter, "3 today · 2 lists"); lists without a space are outlined pills with a dot,
   after a thin divider. Nothing to show → nothing at all (no empty state). No label (0.287): hovering a tile or pill says what it is. No "New space" pill: the + does that.
   Replaces the old chips row on both computer Home layouts (Calm column and Bento). Clicks: [data-space] (existing) and [data-loose] (12g). */
function hmPlaces(){
  const sps=orderedSpaces(),lo=looseLists();if(!sps.length&&!lo.length)return '';
  const tile=sp=>{const st=spaceStats(sp),n=st.lists;
    return `<button class="hm-sp" data-space="${sp.id}" style="--sc:${sp.c}" data-tip="Space"><span class="hm-ic">${sp.e?esc(sp.e):esc((sp.name[0]||'?').toUpperCase())}</span><b>${esc(sp.name)}</b><small>${st.today?`${st.today} today`:`${st.open} open`} · ${n} ${n===1?'list':'lists'}</small></button>`};
  const pill=l=>`<button class="hm-ls" data-loose="${l.id}" data-tip="List"><i style="background:${l.c}"></i><b>${esc(l.name)}</b><small>${nwOpenN(l.id)} open</small></button>`;
  return `<div class="hm"><div class="hm-row">${sps.map(tile).join('')}${sps.length&&lo.length?'<span class="hm-dv" aria-hidden="true"></span>':''}${lo.map(pill).join('')}</div></div>`;
}
const _hpRender=render;
render=function(){const r=_hpRender.apply(this,arguments);
  try{document.querySelectorAll('#dHome .cm-sps,#dHome .bn-sps').forEach(el=>{el.outerHTML=hmPlaces()});hpDivider()}catch(e){}return r};
/* the thin divider only shows between a space and a list on the same line; when the lists wrap to a new line it hides */
function hpDivider(){document.querySelectorAll('#dHome .hm-dv').forEach(d=>{d.style.display='';const p=d.previousElementSibling,n=d.nextElementSibling;
  const mid=e=>{const r=e.getBoundingClientRect();return r.top+r.height/2};d.style.display=p&&n&&Math.abs(mid(p)-mid(n))<16?'':'none'})}
addEventListener('resize',()=>{try{hpDivider()}catch(e){}});
