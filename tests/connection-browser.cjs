// Idea61582 follow-up: a valid connection must not depend on screen capture rights.
const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=process.env.EXTENSION_DIR || path.resolve(__dirname,'..'),out=process.env.QA_DIR;if(!out)throw Error('QA_DIR required');
 const profile=fs.mkdtempSync(path.join(out,'connection-profile-'));let context,worker;
 const launch=()=>chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 let mode='success',captures=0,projects=0;
 // Network-only fixture in the real worker: CDP context routing does not
 // reliably attach to an already-restored service worker after browser restart.
 const routes=async()=>{
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  await worker.evaluate(()=>{
   const nativeFetch=globalThis.fetch;globalThis.__fixtureMode='success';globalThis.__requestCounts={captures:0,projects:0};
   globalThis.fetch=async(url,init)=>{
    if(!String(url).startsWith('https://picklog.devislife.com/'))return nativeFetch(url,init);
    if((init?.method || 'GET')!=='GET')throw Error('unexpected_write');
    if(init?.headers?.['X-Picklog-Token']!=='synthetic-pat-persistent-61582' || globalThis.__fixtureMode==='expired')return new Response('{}',{status:401});
    if(String(url).endsWith('/api/captures')){globalThis.__requestCounts.captures++;return Response.json({images:[]});}
    if(String(url).endsWith('/api/issue-projects')){globalThis.__requestCounts.projects++;return Response.json({projects:[{project_key:'DEV',name:'검증 프로젝트'}]});}
    throw Error('unexpected_path');
   };
  });
 };
 try{
  context=await launch();await routes();worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
  const manage=await context.newPage();await manage.goto('chrome://extensions');await manage.evaluate(id=>chrome.developerPrivate.addHostPermission(id,'https://picklog.devislife.com/*'),id);await manage.close();
  let options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);await options.waitForFunction(()=>!document.querySelector('#copy-fields').disabled);await options.locator('#advanced').evaluate(x=>x.open=true);
  assert.equal(await worker.evaluate(()=>chrome.permissions.contains({origins:['<all_urls>']})),false);
  assert.equal(await options.locator('#capture-enabled').isChecked(),false);
  await options.locator('#picklog-pat').fill('synthetic-pat-persistent-61582');await options.locator('#picklog-project').fill('DEV');

  await options.locator('#connect').click();await expect(options.locator('#connect')).toBeEnabled();
  ({captures,projects}=await worker.evaluate(()=>globalThis.__requestCounts));
  if(process.env.CAPTURE_PHASE==='baseline'){assert.equal(captures,0);await expect(options.locator('#connection-status')).toContainText('캡처');for(const [kind,width,height] of [['desktop',1920,1080],['tablet',1024,768],['mobile',390,844]]){await options.setViewportSize({width,height});await options.screenshot({path:path.join(out,`baseline-connection-${kind}.png`),fullPage:true});}console.log(JSON.stringify({reproduced:true,blockedBeforeAuthentication:true}));return;}
  assert.ok(captures>0,`Valid PAT must reach Picklog with only the Picklog host grant. Status: ${await options.locator('#connection-status').textContent()}`);
  await expect(options.locator('#connection-status')).toContainText('인증·프로젝트 확인 완료');
  assert.ok(projects>0);assert.equal(await options.locator('#picklog-pat').inputValue(),'');
  await options.locator('#advanced').evaluate(x=>x.open=false);await expect(options.locator('#picklog-summary')).toContainText('DEV');
  // A full browser restart discards worker/session state; the same profile must retain the PAT.
  await options.close();await context.close();context=await launch();await routes();worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');
  await options.locator('#advanced').evaluate(x=>x.open=true);await expect(options.locator('#picklog-project')).toHaveValue('DEV');assert.equal(await options.locator('#picklog-pat').inputValue(),'');
  const fields=await worker.evaluate(()=>chrome.storage.local.get(null));assert.ok(!JSON.stringify(fields).includes('synthetic-pat-persistent-61582'));
  await options.locator('#picklog-pat').fill('synthetic-invalid-input');mode='expired';await worker.evaluate(mode=>globalThis.__fixtureMode=mode,mode);await options.locator('#connect').click();await expect(options.locator('#connection-status')).toContainText('PAT 인증');await expect(options.locator('#picklog-summary')).toContainText('확인 실패');await expect(options.locator('#picklog-pat')).toHaveValue('synthetic-invalid-input');await options.locator('#picklog-pat').fill('');
  mode='success';await worker.evaluate(mode=>globalThis.__fixtureMode=mode,mode);await options.locator('#picklog-project').fill('MISSING');await options.locator('#connect').click();await expect(options.locator('#connection-status')).toContainText('프로젝트 키');
  await options.locator('#picklog-project').fill('DEV');await options.locator('#connect').click();await expect(options.locator('#connection-status')).toContainText('인증·프로젝트 확인 완료');
  for(const [kind,width,height] of [['desktop',1920,1080],['tablet',1024,768],['mobile',390,844]]){
   await options.setViewportSize({width,height});await options.screenshot({path:path.join(out,`implementation-connection-${kind}.png`),fullPage:true});assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  // A stale legacy session must not overwrite the newer persistent PAT.
  await worker.evaluate(()=>chrome.storage.session.set({picklogConnection:{token:'synthetic-stale-token',project:'OTHER'}}));await options.reload();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');assert.equal(await worker.evaluate(async()=>Boolean((await chrome.storage.session.get('picklogConnection')).picklogConnection)),false);await options.locator('#advanced').evaluate(x=>x.open=true);
  await options.locator('#disconnect').click();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');
  // A surviving old-format session record migrates only after durable commit.
  await worker.evaluate(()=>chrome.storage.session.set({picklogConnection:{token:'synthetic-pat-persistent-61582',project:'DEV'}}));await options.reload();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');assert.equal(await worker.evaluate(async()=>Boolean((await chrome.storage.session.get('picklogConnection')).picklogConnection)),false);await options.locator('#advanced').evaluate(x=>x.open=true);
  await options.locator('#disconnect').click();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');await options.close();await context.close();context=await launch();await routes();
  options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');
  fs.writeFileSync(path.join(out,'connection-receipt.json'),JSON.stringify({passed:true,captureDisabled:true,allUrlsGranted:false,checks:['scoped host only','actual auth/project requests','visible status','browser restart persistence','legacy migration preserves newer value','failure retains input','credential not returned','expired PAT','wrong project preserves credential','disconnect persists'],captures,projects},null,2));console.log(JSON.stringify({passed:true,captures,projects}));
 }finally{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
