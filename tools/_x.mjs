import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM});
for(const [n,w,h] of [['d',1400,900],['m',390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(900);
 await p.evaluate(()=>{S.cfg.ui='flow';S.cfg.funnel=true;save();applySettings();render();fnFromTpl(FN_TPL[0]);fnSel=null;openFunnel()});await p.waitForTimeout(300);
 await p.screenshot({path:`/tmp/f5-${n}-empty.png`});
 await p.evaluate(()=>{const st=fnSteps();S.cfg.fn.daily={list:st[0].list,n:2};S.cfg.fn.weekly={list:st[5].list,n:5};fnOpenTasks(st[0].list).slice(0,2).forEach(t=>setStage(t,'done'));fnOpenTasks(st[1].list).slice(0,1).forEach(t=>setStage(t,'done'));save();fnSel=null;drawFunnel()});
 await p.waitForTimeout(300);await p.screenshot({path:`/tmp/f5-${n}-goals.png`,fullPage:false});
 if(n==='m'){await p.evaluate(()=>document.querySelector('.fn-goals').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:`/tmp/f5-m-goals2.png`})}
 console.log(n,errs);await p.close()}
await b.close();
