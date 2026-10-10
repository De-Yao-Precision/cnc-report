const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.join(__dirname,'..'),out=path.join(__dirname,'artifacts');
const results=[];function check(name,ok){assert.ok(ok,name);results.push(name);}
const source=fs.readFileSync(path.join(root,'versions/V18.27.23.html'),'utf8'),modified=fs.readFileSync(path.join(root,'index.html'),'utf8');
const functionNames=[...source.matchAll(/^(?:async )?function (\w+)\(/gm)].map(m=>m[1]);
async function fixture(page){await page.evaluate(()=>{
 const now=appNow(),day=productionDate();
 const person=authPerson('DY003');authFinishLogin(person);
 const fixtureMachines=machines.slice(0,12).map((base,i)=>{
  const id='D'+(i+1),start=now-100*60000,cum=1000+(i===0?118:i===4?54:100);
  const m={...structuredClone(base),id,status:'生產中',wo:'MO-TEST-'+(i+1),drawing:'P060'+(i+1),drawingName:'活塞 '+(i+1),program:'O100'+i,orderQty:2000,cum,cycle:60,processMode:'機械手',defectShift:0,defectOrder:0,down:0,downStart:null,downReason:'',downToolNumber:'',lastUpdate:now-2*60000,lastQtyTime:now-2*60000,responsible:person.name,responsibleEmployeeId:person.employeeId,responsibleSince:start,responsibleStartCum:1000,responsibleStartWO:'MO-TEST-'+(i+1),responsibleSettled:false,pendingTakeover:null,settlementDecision:null,completedAt:null,workOrderRecordId:'test-wo-'+i};
  m.shiftSession={key:day+'|早班',productionDate:day,shift:'早班',operator:person.name,operators:[person.name],startTime:start,startCum:1000,segmentStartCum:1000,segmentStartTime:start,segmentStartWO:m.wo,segmentMode:'機械手',segmentCycle:60,segmentDefect:0,segmentClosed:false,carryOutput:0,segments:[],reportCursor:{time:start,cum:1000,defect:0}};
  m.responsibilityAttribution={operator:person.name,personShift:i===0?'晚班':'早班',segmentId:'test-resp-'+i,startTime:start,startCum:1000,wo:m.wo,processMode:'機械手',cycle:60,source:'test'};
  return m;
 });
 machines.splice(0,machines.length,...fixtureMachines);
 workOrders=machines.map((m,i)=>({id:m.workOrderRecordId,machine:m.id,wo:m.wo,drawing:m.drawing,drawingNameSnapshot:m.drawingName,program:m.program,orderQty:m.orderQty,startedAt:now-200*60000,closedAt:null,status:'生產中',events:[]}));
 responsibilityEvents=machines.map(m=>({type:'segment',id:m.responsibilityAttribution.segmentId,machine:m.id,operator:m.responsible,operatorEmployeeId:m.responsibleEmployeeId,personShift:m.responsibilityAttribution.personShift,shift:m.responsibilityAttribution.personShift,productionDate:day,wo:m.wo,startTime:m.responsibleSince,startCum:1000,status:'open'}));
 machines[1].status='停機';machines[1].downStart=now-42*60000;machines[1].downReason='換刀';machines[1].downToolNumber='T03';machines[1].down=8;
 machines[2].defectShift=8;machines[2].defectOrder=8;
 machines[3].responsible='';machines[3].responsibleEmployeeId='';machines[3].responsibilityAttribution=null;machines[3].pendingTakeover={cutTime:now-36*60000,cutCum:1075,settledBy:'上一位人員',wo:machines[3].wo};
 machines[5].lastUpdate=now-121*60000;
 machines[6].cum=1079;machines[7].cum=1080;machines[8].cum=1060;machines[9].cum=1059;
 machines[10].responsibilityAttribution.legacyNeedsRetakeover=true;
 machines[11].status='待建立製令';machines[11].wo='';machines[11].orderQty=0;machines[11].responsible='';machines[11].responsibilityAttribution=null;
 downtimeEvents=[{eventId:'stop-1',groupId:'tool-group',machine:'D2',wo:machines[1].wo,reason:'換刀',toolNumber:'T03',startTime:now-42*60000,endTime:null,status:'open'},{eventId:'old-tool',groupId:'old-group',machine:'D2',wo:machines[1].wo,reason:'換刀',toolNumber:'T99',startTime:now-500*60000,endTime:now-490*60000,status:'closed'}];
 shiftRecordsData=[];operatorSettlementEvents=[];defectEvents=[];auditLogs=[];
 renderAll();authShowView('owner');
 });}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url==='/baseline'?source:modified)}).listen(0,'127.0.0.1');
 const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Asia/Taipei',acceptDownloads:true});
 const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-10T14:00:00+08:00')});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForTimeout(300);
 await page.clock.setFixedTime(new Date('2026-10-10T14:00:00+08:00'));await fixture(page);
 const baselineContext=await browser.newContext({timezoneId:'Asia/Taipei'}),base=await baselineContext.newPage();base.on('pageerror',e=>errors.push('baseline: '+e.message));await base.clock.install({time:new Date('2026-10-10T14:00:00+08:00')});await base.goto('http://127.0.0.1:'+server.address().port+'/baseline');await base.waitForTimeout(300);await fixture(base);
 await base.clock.setFixedTime(new Date('2026-10-10T14:00:00+08:00'));await fixture(base);
 const readFunctions=async p=>p.evaluate(names=>Object.fromEntries(names.map(n=>[n,eval(n).toString()])),functionNames);
 const a=await readFunctions(base),b=await readFunctions(page),changes=functionNames.filter(n=>a[n]!==b[n]);
 check('only five presentation/access integration functions changed',JSON.stringify(changes.sort())===JSON.stringify(['authApplyAccess','authShowView','renderCards','renderOwner','showDetail'].sort()));
 const protectedCount=functionNames.length-changes.length;
 for(const id of ['operator','history','defectRecords','workOrderHistory','erpImportPreview','shiftRecords','monthly','systemAdmin','rules']){
  const section=t=>t.match(new RegExp('<section id="'+id+'"[\\s\\S]*?<\\/section>'))?.[0];check('protected section unchanged: '+id,section(source)===section(modified));
 }
 const checks=await page.evaluate(()=>{
  const list=[];const ok=(name,v)=>{if(!v)throw Error(name);list.push(name)};
  ok('supervisor unified route',authShowView('supervisor')&&document.querySelector('.view.active').id==='owner');
  ok('only one dashboard tab',document.querySelectorAll('[data-view="owner"]').length===1&&!document.querySelector('[data-view="supervisor"]'));
  const data=machines.map(rtMachine),by=id=>data.find(d=>d.m.id===id);
  ok('stop / defect / pending / stale / low rate attention',by('D2').rank===0&&by('D3').rank===1&&by('D4').rank===2&&by('D6').rank===3&&by('D5').rank===4);
  ok('pending quantity not personal',by('D4').waiting===25&&by('D4').p.output===null&&by('D4').p.rate===null);
  ok('person shift follows responsibility',by('D1').shift==='晚班');
  ok('tool summary respects work order instance',by('D2').tool==='T03 ×1');
  ok('legacy target remains unconfirmed',by('D11').p.target===null&&by('D11').p.rate===null&&by('D11').rank===9);
  ok('no-order percentage not NaN',by('D12').pct===null&&!machineCards.innerHTML.includes('NaN'));
  for(const d of data){ok('source field mapping '+d.m.id,d.m===machines.find(m=>m.id===d.m.id)&&d.name===(d.w?.drawingNameSnapshot||d.m.drawingName||'未留存'));if(d.m.responsible&&!d.m.responsibilityAttribution?.legacyNeedsRetakeover){const p=currentPersonStats(d.m);ok('personal figures equal existing helper '+d.m.id,p.output===d.p.output&&p.target===d.p.target&&p.rate===d.p.rate)}}
  for(const [id,cls] of [['D1','rt-good'],['D8','rt-blue'],['D9','rt-yellow'],['D10','rt-red']])ok('rate color '+id,rtRate(by(id)).includes(cls));
  const p=structuredClone(machines[3]),now=appNow();p.pendingTakeover.cutTime=now-30*60000;ok('pending exactly 30 not overdue',!rtMachine(p).issues.some(i=>i.rank===2));p.pendingTakeover.cutTime--;ok('pending just over 30 overdue',rtMachine(p).issues.some(i=>i.rank===2));
  const m=structuredClone(machines[0]);m.lastUpdate=now-120*60000;ok('stale exactly 120 not overdue',!rtMachine(m).issues.some(i=>i.rank===3));m.lastUpdate--;ok('stale over 120 minutes by 1ms',rtMachine(m).issues.some(i=>i.rank===3));m.lastUpdate=now-121*60000;ok('stale 121 overdue',rtMachine(m).issues.some(i=>i.rank===3));
  ok('80 percent not alerted',!by('D8').issues.some(i=>i.rank===4));ok('79 percent alerted',by('D7').issues.some(i=>i.rank===4));
  const snapshot=()=>JSON.stringify({machines,responsibilityEvents,downtimeEvents,shiftRecordsData,workOrders,storage:Object.fromEntries(Object.entries(localStorage).sort())}),before=snapshot();renderOwner();renderCards();ok('render is read-only including localStorage',before===snapshot());
  const originalEvents=structuredClone(responsibilityEvents);responsibilityEvents=[{type:'segment',id:'closed-1',status:'closed',machine:'D1',operator:'甲',personShift:'早班',productionDate:productionDate(),output:50,target:100,effectiveMinutes:100,downMinutes:0},{type:'segment',id:'closed-2',status:'closed',machine:'D2',operator:'乙',personShift:'晚班',productionDate:productionDate(),output:200,target:200,effectiveMinutes:200,downMinutes:0},{type:'segment',id:'unconfirmed',status:'open',machine:'D3',operator:'丙',personShift:'早班',productionDate:productionDate()}];
  ok('KPI uses confirmed weighted average',Math.abs(rtToday().rate-250/300*100)<1e-10&&rtToday().confirmed===2);responsibilityEvents=originalEvents;
  ok('today output equals existing monthly records',rtToday().output===monthRecords(productionDate().slice(0,7)).filter(r=>r.productionDate===productionDate()).reduce((n,r)=>n+r.output,0));
  renderOwner();renderCards();return list;
 });results.push(...checks);
 // Compare protected report and workbook outputs using the same fixture at fixed time.
 const projection=async p=>p.evaluate(()=>JSON.stringify({rows:machineOrderReportRows().map(g=>({machine:g.machine,output:g.output,target:g.target,rate:g.rate,tool:g.toolText})),month:buildMonthWorkbookData(productionDate().slice(0,7)),personal:machines.map(m=>currentPersonStats(m)),down:machines.map(liveDown)}));
 const baselineProjection=await projection(base),newProjection=await projection(page);fs.writeFileSync(path.join(__dirname,'baseline-projection.json'),baselineProjection);fs.writeFileSync(path.join(__dirname,'new-projection.json'),newProjection);check('baseline/new report, monthly, workbook-data, personal and downtime parity',baselineProjection===newProjection);
 await page.locator('#searchBox').fill('活塞 1');check('drawing-name search',await page.locator('.rt-table tbody tr').count()===4);await page.locator('#searchBox').fill('');await page.locator('#filterStatus').selectOption('待接手');check('pending status filter',await page.locator('.rt-table tbody tr').count()===1);
 await page.locator('#alerts [data-machine="D2"]').click();check('attention opens correct detail',await page.locator('#detailModal').evaluate(el=>el.classList.contains('open'))&&await page.locator('#modalTitle').textContent()==='D2｜停機');await page.locator('#closeModal').click();
 await page.locator('#sortBy').selectOption('rate');check('lowest rate sorting',await page.locator('.rt-table tbody tr').first().getAttribute('data-machine')==='D5');await page.locator('#sortBy').selectOption('abnormal');
 check('desktop no page horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'V18.27.24-desktop-1440.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});check('mobile cards replace table',await page.locator('.rt-table').isHidden()&&await page.locator('.rt-mobile').isVisible());check('390 no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#alerts [data-machine="D4"]').click();check('mobile attention expands card',await page.locator('details[data-machine="D4"]').getAttribute('open')!==null);await page.evaluate(()=>document.querySelector('.rt-mobile').scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:path.join(out,'V18.27.24-mobile-390.png')});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'V18.27.24-mobile-summary.png')});
 await page.locator('details[data-machine="D4"] [data-detail="D4"]').click();check('mobile retains original machine details',await page.locator('#detailModal .rt-legacy').count()===1);await page.locator('#closeModal').click();
 await page.locator('details[data-machine="D4"] [data-rt-view="workOrderHistory"]').click();check('history link uses existing page',await page.locator('#workOrderHistory').evaluate(el=>el.classList.contains('active')));await page.evaluate(()=>authShowView('owner'));
 const roles=await page.evaluate(()=>{const list=[];personnelStore.TESTOWNER={...personnelStore.DY003,employeeId:'TESTOWNER',name:'測試老闆',roleCode:'owner',status:'ACTIVE'};authFinishLogin(authPerson('TESTOWNER'));if(!authShowView('owner')||!authShowView('supervisor'))throw Error('owner denied');list.push('owner and supervisor share dashboard');authFinishLogin(authPerson('DY003'));showDetail('D1');authFinishLogin(authPerson('DY007'));if(authAllowedView('owner')||authShowView('owner')||authShowView('supervisor')||document.querySelector('[data-view="owner"]').hidden===false||detailModal.classList.contains('open'))throw Error('operator leak');showDetail('D1');if(detailModal.classList.contains('open'))throw Error('direct detail leak');list.push('operator denied tab/routes/details including role switch');authFinishLogin(authPerson('DY003'));return list;});results.push(...roles);
 for(const v of ['operator','shiftRecords','monthly','workOrderHistory','defectRecords','history','erpImportPreview']){await page.evaluate(v=>{if(!authShowView(v))throw Error('access '+v);renderAll();},v);check('page renders without exception: '+v,true);}
 await page.evaluate(()=>{authShowView('monthly');monthSelect.value=productionDate().slice(0,7);renderMonthly();});
 const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>exportMonth());const download=await downloadPromise;const xlsx=path.join(__dirname,'test-export.xlsx');await download.saveAs(xlsx);check('Excel download generated ZIP',fs.readFileSync(xlsx).readUInt32LE(0)===0x04034b50);
 page.on('dialog',dialog=>dialog.accept());
 const login=await page.evaluate(async()=>{authLogout();const result=await authLogin('DY007','');return result.needsPersonShift?authSelectPersonShift('晚班'):result;});check('operator real login and person-shift selection',login.ok);
 await page.evaluate(()=>{const m=machines[0];m.responsible='';m.responsibleEmployeeId='';m.responsibilityAttribution=null;m.pendingTakeover=null;registerMachineTakeover(m,currentOperator().name,m.cum);saveMachineState();opMachine.value=m.id;syncOpMachine();});
 check('operator takeover uses selected shift',await page.evaluate(()=>responsibilityShift(machines[0])==='晚班'&&machines[0].responsible===currentOperator().name));
 await page.clock.setFixedTime(new Date('2026-10-10T14:10:00+08:00'));
 await page.evaluate(async()=>{authLastActivity=realNow();if(authSession?.locked)await authUnlock('');});
 const settled=await page.evaluate(()=>{const m=machines[0],e=createOperatorSettlement(m,{kind:'unified'},appNow(),currentOperator().name,'UI回歸測試',m.cum+10);saveMachineState();openSettlementChoice(m.id);return {output:e.personOutput,target:e.personTarget,choice:!!m.settlementDecision,owner:m.responsible};});
 check('operator settlement freezes 10 PCS / 10 target and releases responsibility',settled.output===10&&settled.target===10&&settled.choice&&settled.owner==='');
 await page.locator('#settlementContinue').click();check('post-settlement continue preserves pending takeover',await page.evaluate(()=>!!machines[0].pendingTakeover&&!machines[0].settlementDecision&&machines[0].status==='生產中'));
 await page.clock.setFixedTime(new Date('2026-10-10T14:20:00+08:00'));
 await page.evaluate(async()=>{authLastActivity=realNow();if(authSession?.locked)await authUnlock('');});
 await page.evaluate(()=>{openPendingStopModal(machines[0].id);document.getElementById('pendingStopTime').value=pendingStopInputValue(appNow());document.getElementById('pendingStopCum').value=machines[0].cum;document.getElementById('pendingStopReason').value='機台故障';});
 await page.locator('#pendingStopConfirm').click();check('operator reports actual stop after settlement',await page.evaluate(()=>machines[0].status==='停機'&&machines[0].downStart===appNow()&&!machines[0].responsible));
 check('zero JavaScript page errors',errors.length===0);
 fs.writeFileSync(path.join(out,'V18.27.24-verification.json'),JSON.stringify({passed:results.length,checks:results,protectedFunctionsUnchanged:protectedCount,changedFunctions:changes,pageErrors:errors,viewport:[1440,390],fixture:true},null,2));
 console.log(JSON.stringify({passed:results.length,protectedFunctionsUnchanged:protectedCount,pageErrors:errors}));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
