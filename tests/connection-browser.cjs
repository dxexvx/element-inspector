// Idea61582: testing a draft must never replace the connection used by captures.
const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=process.env.EXTENSION_DIR || path.resolve(__dirname,'..'),out=process.env.QA_DIR;if(!out)throw Error('QA_DIR required');
 const profile=fs.mkdtempSync(path.join(out,'connection-profile-'));let context,worker,id;const errors=[];
 const launch=async()=>{const result=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});result.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));return result;};
 const routes=async()=>{
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  // Network-only fixture survives a full browser restart; UI/worker/DB are real.
  await worker.evaluate(()=>{
   const nativeFetch=globalThis.fetch;globalThis.__fixtureMode='success';globalThis.__requestCounts={captures:0,projects:0,total:0};
   globalThis.fetch=async(url,init)=>{
    if(!String(url).startsWith('https://picklog.devislife.com/'))return nativeFetch(url,init);
    globalThis.__requestCounts.total++;
    if((init?.method || 'GET')!=='GET')throw Error('unexpected_write');
    if(globalThis.__fixtureMode==='offline')throw Error('fixture_offline');
    if(init?.headers?.['X-Picklog-Token']!=='synthetic-pat-persistent-61582' || globalThis.__fixtureMode==='expired')return new Response('{}',{status:401});
    if(String(url).endsWith('/api/captures')){globalThis.__requestCounts.captures++;return Response.json({images:[]});}
    if(String(url).endsWith('/api/issue-projects')){globalThis.__requestCounts.projects++;return Response.json({projects:[{project_key:'DEV'},{project_key:'OTHER'}]});}
    throw Error('unexpected_path');
   };
  });
 };
 const counts=()=>worker.evaluate(()=>globalThis.__requestCounts);
 const stored=()=>worker.evaluate(async()=>await ElementInspectorConnectionStore.read() || null);
 const openOptions=async()=>{const page=await context.newPage();await page.goto(`chrome-extension://${id}/options.html`);await expect(page.locator('#connect')).toBeEnabled();await page.locator('#advanced').evaluate(x=>x.open=true);return page;};
 const save=async page=>{await page.getByRole('button',{name:'저장',exact:true}).click();await expect(page.locator('#settings-status')).toHaveText('저장했습니다.');};
 try{
  context=await launch();await routes();id=new URL(worker.url()).host;
  const manage=await context.newPage();await manage.goto('chrome://extensions');await manage.evaluate(id=>chrome.developerPrivate.addHostPermission(id,'https://picklog.devislife.com/*'),id);await manage.close();
  let options=await openOptions();
  assert.equal(await worker.evaluate(()=>chrome.permissions.contains({origins:['<all_urls>']})),false);
  assert.equal(await options.locator('#capture-enabled').isChecked(),false);
  assert.equal(await options.getByRole('button',{name:/저장/}).count(),1);
  await options.locator('#picklog-pat').fill('synthetic-pat-persistent-61582');await options.locator('#picklog-project').fill('DEV');
  await options.getByRole('button',{name:'연결 테스트',exact:true}).click();await expect(options.locator('#connect')).toBeEnabled();
  assert.deepEqual(await counts(),{captures:1,projects:1,total:2});
  assert.equal(await stored(),null,'Connection test must not save the draft PAT');
  await expect(options.locator('#connection-status')).toContainText('인증·프로젝트 확인 완료');await expect(options.locator('#connection-status')).toContainText('저장을 눌러');
  await expect(options.locator('#picklog-pat')).toHaveValue('synthetic-pat-persistent-61582');
  // Closing an unsaved successful test leaves no connection behind.
  await options.reload();await expect(options.locator('#connect')).toBeEnabled();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');await options.locator('#advanced').evaluate(x=>x.open=true);
  await options.locator('#picklog-pat').fill('synthetic-pat-persistent-61582');await options.locator('#picklog-project').fill('DEV');
  const beforeSave=await counts();await worker.evaluate(()=>globalThis.__fixtureMode='offline');
  await options.locator('#shortcut').press('Control+Shift+Q');await options.locator('input[value="css"]').uncheck();
  await save(options);assert.deepEqual(await counts(),beforeSave,'Save must not contact Picklog');await expect(options.locator('#picklog-pat')).toHaveValue('');await expect(options.locator('#picklog-summary')).toContainText('PAT 저장됨');
  assert.equal((await stored()).project,'DEV');
  const settings=await worker.evaluate(()=>chrome.storage.local.get(null));assert.equal(settings.shortcut.code,'KeyQ');assert.equal(settings.copyFields.css,false);assert.equal(settings.captureEnabled,false);assert.ok(!JSON.stringify(settings).includes('synthetic-pat-persistent-61582'));
  // A full restart discards memory; the saved PAT must still authenticate.
  await context.close();context=await launch();await routes();options=await openOptions();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');await expect(options.locator('#picklog-project')).toHaveValue('DEV');
  const original=await stored();
  await options.locator('#picklog-pat').fill('synthetic-invalid-input');await options.locator('#connect').click();await expect(options.locator('#picklog-summary')).toContainText('PAT 인증');await expect(options.locator('#picklog-pat')).toHaveValue('synthetic-invalid-input');assert.deepEqual(await stored(),original);
  await options.locator('#picklog-pat').fill('');await options.locator('#picklog-project').fill('MISSING');await options.locator('#connect').click();await expect(options.locator('#picklog-summary')).toContainText('프로젝트 키');assert.deepEqual(await stored(),original);
  await options.locator('#picklog-project').fill('OTHER');await options.locator('#connect').click();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');assert.deepEqual(await stored(),original,'Successful test must not replace saved project');
  const beforeProjectSave=await counts();await save(options);assert.deepEqual(await counts(),beforeProjectSave);assert.equal((await stored()).token,original.token);assert.equal((await stored()).project,'OTHER');await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');
  // Editing a verified draft clears its success before it can be mistaken for a saved connection.
  await options.locator('#picklog-project').fill('DEV');await expect(options.locator('#picklog-summary')).not.toContainText('인증·프로젝트 확인 완료');assert.equal(await options.locator('#picklog-summary').getAttribute('data-state'),'unverified');await save(options);
  for(const [kind,width,height] of [['desktop',1920,1080],['tablet',1024,768],['mobile',390,844]]){await options.setViewportSize({width,height});await options.screenshot({path:path.join(out,`implementation-connection-${kind}.png`),fullPage:true});assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  // Legacy migration and explicit deletion retain their existing contracts.
  await worker.evaluate(()=>chrome.storage.session.set({picklogConnection:{token:'synthetic-stale-token',project:'OTHER'}}));await options.reload();await expect(options.locator('#connect')).toBeEnabled();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');assert.equal((await stored()).project,'DEV');assert.equal(await worker.evaluate(async()=>Boolean((await chrome.storage.session.get('picklogConnection')).picklogConnection)),false);
  await options.locator('#advanced').evaluate(x=>x.open=true);await options.locator('#disconnect').click();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');
  await worker.evaluate(()=>chrome.storage.session.set({picklogConnection:{token:'synthetic-pat-persistent-61582',project:'DEV'}}));await options.reload();await expect(options.locator('#connect')).toBeEnabled();await expect(options.locator('#picklog-summary')).toContainText('인증·프로젝트 확인 완료');assert.equal(await worker.evaluate(async()=>Boolean((await chrome.storage.session.get('picklogConnection')).picklogConnection)),false);
  await options.locator('#advanced').evaluate(x=>x.open=true);await options.locator('#disconnect').click();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');await save(options);assert.equal(await stored(),null);
  await context.close();context=await launch();await routes();options=await openOptions();await expect(options.locator('#picklog-summary')).toContainText('저장된 연결 없음');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'connection-receipt.json'),JSON.stringify({passed:true,checks:['single save button','test does not save new PAT','unsaved test discarded on reload','save without network','basic settings and PAT saved together','browser restart persistence','failed test retains input and saved PAT','successful project test leaves saved project unchanged','blank PAT retains credential on save','edited draft invalidates test','legacy migration','disconnect persists'],captureDisabled:true,allUrlsGranted:false,errors},null,2));console.log(JSON.stringify({passed:true,checks:12}));
 }finally{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
