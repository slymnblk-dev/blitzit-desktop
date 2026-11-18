import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:process.env.PW_CHROMIUM});
for(const [n,w,h] of [['d',1400,900],['m',390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:4173/index.html');await p.waitForTimeout(900);
 await p.evaluate(()=>{Object.assign(S.cfg,{ui:'flow',funnel:true,plan:true,journal:true,wins:true,fnHome:true});save();applySettings();render();fnFromTpl(FN_TPL[0]);const st=fnSteps();S.cfg.fn.daily={list:st[3].list,n:2};S.cfg.fn.weekly={list:st[5].list,n:5};
  fnOpenTasks(st[0].list).slice(0,2).forEach(t=>setStage(t,'done'));fnOpenTasks(st[1].list).slice(0,2).forEach(t=>setStage(t,'done'));save();fnSel=null;openFunnel()});
 await p.waitForTimeout(400);await p.screenshot({path:`/tmp/f3-${n}-main.png`});
 await p.locator('[data-fnday="-1"]').click();await p.waitForTimeout(300);await p.screenshot({path:`/tmp/f3-${n}-past.png`});
 await p.evaluate(()=>{closeFunnel();goHome();render()});await p.waitForTimeout(400);await p.screenshot({path:`/tmp/f3-${n}-home.png`});
 await p.evaluate(()=>{openFunnel();fnEdit=true;drawFunnel()});await p.waitForTimeout(300);await p.screenshot({path:`/tmp/f3-${n}-edit.png`,fullPage:false});
 console.log(n,errs);await p.close()}
await b.close();
