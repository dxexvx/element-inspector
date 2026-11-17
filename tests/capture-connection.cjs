// Actual extension overview captures; fixed height keeps viewport and PNG dimensions equal.
const {chromium,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=process.env.EXTENSION_DIR || path.resolve(__dirname,'..'),out=process.env.QA_DIR,phase=process.env.CAPTURE_PHASE;
 if(!out || !['baseline','implementation'].includes(phase))throw Error('Set QA_DIR and CAPTURE_PHASE');
 const profile=fs.mkdtempSync(path.join(out,'connection-capture-'));let context;
 try{
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
  await worker.evaluate(()=>{globalThis.fetch=async url=>Response.json(String(url).endsWith('/api/issue-projects')?{projects:[{project_key:'DEV'}]}:{images:[]});});
  const manage=await context.newPage();await manage.goto('chrome://extensions');await manage.evaluate(id=>chrome.developerPrivate.addHostPermission(id,'https://picklog.devislife.com/*'),id);await manage.close();
  const page=await context.newPage();await page.goto(`chrome-extension://${id}/options.html`);await page.waitForFunction(()=>!document.querySelector('#copy-fields').disabled);await page.locator('#advanced').evaluate(x=>x.open=true);await page.locator('#picklog-pat').fill('synthetic-pat-persistent-61582');await page.locator('#picklog-project').fill('DEV');await page.locator('#connect').click();await expect(page.locator('#connect')).toBeEnabled();await expect(page.locator('#connection-status')).toContainText(phase==='baseline'?'캡처':'인증·프로젝트 확인 완료');
  for(const [kind,width] of [['desktop',1920],['tablet',1024],['mobile',390]]){await page.setViewportSize({width,height:1800});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`${phase}-connection-overview-${kind}.png`)});}
  console.log(JSON.stringify({phase,captured:3,cssHeight:1800}));
 }finally{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
