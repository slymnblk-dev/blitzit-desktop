// Visual safety net for refactors: node tools/shots.mjs <outdir> takes 120 screenshots (phone/computer x Flow/Classic x light/dark x 15 screens), frozen clock, no animation.
// Take a "before" set, change code, take an "after" set, then: python3 tools/shots-diff.py before after  (0 differ = pixel-identical).
import {chromium} from 'playwright';import fs from 'fs';
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM});
const views=[['home',p=>p.evaluate(()=>{goHome();render()})],
 ['space',p=>p.evaluate(()=>{const s=S.spaces[0];openSpace(s.id||s.name);render()})],
 ['today',p=>p.evaluate(()=>{const s=S.spaces[0];openSpace(s.id||s.name);setStage&&0;S.stage='today';render()})],
 ['settings',p=>p.evaluate(()=>openSettings())],
 ['add',p=>p.evaluate(()=>document.getElementById('addBtn').click())],
 ['detail',p=>p.evaluate(()=>openDetail(S.tasks.find(t=>t.stage!=='done').id))]];
const tabs=['habits','goals','vision','journal','plan','routines','metrics','wins','inbox'];
for(const [dev,w,h] of [['m',390,844],['d',1400,900]])for(const ui of ['flow','classic'])for(const th of ['dark','light']){
 const ctx=await b.newContext({viewport:{width:w,height:h},reducedMotion:'reduce',colorScheme:th});const p=await ctx.newPage();
 await p.addInitScript(()=>{const D=Date;const t0=new D('2026-11-17T10:00:00').getTime();Date=class extends D{constructor(...a){super(...(a.length?a:[t0]))}static now(){return t0}};Math.random=()=>.42});
 await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(900);
 await p.evaluate(([ui,th])=>{Object.assign(S.cfg,{ui,habits:true,goals:true,vision:true,journal:true,plan:true,routines:true,wins:true,inbox:true,mx:true});try{S.theme=th;S.cfg.theme=th}catch(e){};save();applySettings();render()},[ui,th]);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 const shot=async n=>{await p.waitForTimeout(250);await p.screenshot({path:`${out}/${dev}-${ui}-${th}-${n}.png`})};
 for(const [n,f] of views){try{await p.keyboard.press('Escape');await p.evaluate(()=>{try{closeSheets()}catch(e){}});await f(p);await shot(n)}catch(e){}}
 for(const t of tabs){try{await p.evaluate(()=>{try{closeSheets()}catch(e){};goHome()});await p.evaluate(t=>tbGo(t),t);await shot('tab-'+t)}catch(e){}}
 await ctx.close()}
await b.close();console.log(fs.readdirSync(out).length,'shots');
