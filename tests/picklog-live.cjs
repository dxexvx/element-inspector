// Idea61582: actual fixed-origin API; token arrives only on private stdin.
const {chromium,expect}=require('@playwright/test');
const {pressAreaShortcut}=require('./area-shortcut.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const input=JSON.parse(fs.readFileSync(0,'utf8'));if(input.project!=='CHROMEEXT' || typeof input.token!=='string')throw Error('input_rejected');
 const area=process.argv.includes('--area');
 const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR,profile=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'element-inspector-live-'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><title>캡처 연동 확인</title><style>body{font:18px system-ui;padding:60px;background:white}#capture-fixture{width:240px;height:120px;background:#206840;color:white;display:grid;place-items:center}h1{font-size:24px}</style><h1 tabindex="-1">합성 이미지로 Picklog 연동 확인</h1><div id="capture-fixture">엘리먼트 캡처 검증</div></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let context,worker,ownedId=null,cleanup=false,result,step='launch',pixelEvidence;
 try{
  const launch=()=>chromium.launchPersistentContext(profile,{channel:'chromium',headless:false,viewport:null,args:['--window-size=1280,900',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
  context=await launch();
  context.setDefaultTimeout(45000);worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
  // Observe real upload responses for owned cleanup even if later clipboard/readback fails.
  const observeUpload=()=>context.on('response',async response=>{try{if(response.url()==='https://picklog.devislife.com/api/captures' && response.request().method()==='POST' && response.status()===201){const data=await response.json();if(/^cap_[A-Za-z0-9]{10,80}$/.test(data.image?.public_id) && data.image.issue_project_key==='CHROMEEXT')ownedId=data.image.public_id;}}catch{}});;observeUpload();
  step='permissions';
  const permission=area?'https://picklog.devislife.com/*':'<all_urls>';
  const management=await context.newPage();await management.goto('chrome://extensions');
  await management.evaluate(({id,permission})=>chrome.developerPrivate.addHostPermission(id,permission),{id,permission});await management.close();
  const options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);await options.waitForFunction(()=>!document.querySelector('#copy-fields').disabled);
  if(area){
   await options.locator('#advanced summary').click();
   await options.getByRole('button',{name:'연결 테스트',exact:true}).click();
  }else{
   await options.locator('#capture-enabled').check();
   await options.getByRole('button',{name:'저장',exact:true}).click();
  }
  await expect.poll(()=>worker.evaluate(permission=>chrome.permissions.contains({origins:[permission]}),permission),{timeout:10000}).toBe(true);
  // The existing enrolled PAT is consumed by the trusted extension worker only.
  step='store_connection';
  const connected=await worker.evaluate(data=>configureConnection({type:'element-inspector:save-connection',...data}),input);input.token='';assert.ok(connected.ok && connected.saved);
  await options.close();await context.close();context=await launch();context.setDefaultTimeout(45000);worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');observeUpload();
  step='reopen_connection';
  const persisted=await worker.evaluate(()=>configureConnection({type:'element-inspector:connection',verify:true}));assert.ok(persisted.ok && persisted.connected && persisted.projectVerified);
  const reopened=await context.newPage();await reopened.goto(`chrome-extension://${id}/options.html`);await reopened.locator('#picklog-summary[data-state=verified]').waitFor();await reopened.screenshot({path:path.join(out,'connection-live-restarted.png')});await reopened.close();
  const page=await context.newPage(),url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url);
  await context.grantPermissions(['clipboard-read'],{origin:new URL(url).origin});
  const target=page.locator('#capture-fixture'),overlay=page.locator('devis-element-inspector');
  const start=Date.now();
  let match;
  if(area){
   step='narrow_permissions';
   assert.equal(await worker.evaluate(()=>chrome.permissions.contains({origins:['<all_urls>']})),false);
   step='native_shortcut';
   await pressAreaShortcut(page,worker,profile);
   await page.locator('[data-area]').waitFor();
   const rect=await target.boundingBox();
   await page.mouse.move(rect.x+8,rect.y+8);await page.mouse.down();
   await page.mouse.move(rect.x+208,rect.y+88,{steps:6});await page.mouse.up();
   step='clipboard_status';
   await expect(overlay.locator('[data-tooltip]')).toContainText('이미지를 클립보드에 복사했습니다');
   step='clipboard_pixels';
   pixelEvidence=await page.evaluate(async()=>{
    const item=(await navigator.clipboard.read()).find(x=>x.types.includes('image/png'));
    if(!item)return null;
    const bitmap=await createImageBitmap(await item.getType('image/png'));
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');
    ctx.drawImage(bitmap,0,0);
    return {width:bitmap.width,height:bitmap.height,scale:devicePixelRatio,pixel:[...ctx.getImageData(0,0,1,1).data]};
   });
   step='upload_readback';
   await expect(overlay.locator('[data-tooltip]')).toContainText('Picklog 캔버스에 저장했습니다');
   match=(await overlay.locator('[data-tooltip]').textContent()).match(/(cap_[A-Za-z0-9]+)/);
  }else{
   await worker.evaluate(async()=>{const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});await chrome.windows.update(tab.windowId,{focused:true});});
   await page.bringToFront();await page.locator('h1').focus();await target.hover();await page.keyboard.press('Alt+Shift+E');await target.click();
   await overlay.getByText('캡처를 업로드하고 참조 ID를 복사했습니다',{exact:false}).waitFor();
   const text=await page.evaluate(()=>navigator.clipboard.readText());assert.match(text,/CSS: #capture-fixture/);
   match=text.match(/Picklog 캔버스 ID: (cap_[A-Za-z0-9]+)/);
  }
  const durationMs=Date.now()-start;
  step='returned_capture_id';
  assert.ok(match);if(ownedId)assert.equal(match[1],ownedId);ownedId=match[1];
  if(area){
   step='clipboard_pixels';
   assert.ok(pixelEvidence);
   assert.ok(Math.abs(pixelEvidence.width-200*pixelEvidence.scale)<=1 && Math.abs(pixelEvidence.height-80*pixelEvidence.scale)<=1);
   assert.deepEqual(pixelEvidence.pixel,[32,104,64,255]);
  }
  await page.screenshot({path:path.join(out,area?'area-live-result.png':'capture-live-result.png')});
  result={passed:true,publicId:ownedId,cleanup:false,durationMs};
 }catch(error){result={passed:false,publicId:ownedId,cleanup:false,error:step+':'+error.name+(step==='clipboard_pixels'?':'+JSON.stringify(pixelEvidence):'')};}
 finally{
  if(ownedId && worker){
   try{cleanup=await worker.evaluate(async publicId=>{
     if(!/^cap_[A-Za-z0-9]{10,80}$/.test(publicId))return false;
     const connection=await readConnection();
     const headers={'X-Picklog-Token':connection.token,Accept:'application/json'};
     const url=`https://picklog.devislife.com/api/captures/${publicId}`;
     const deleted=await fetch(url,{method:'DELETE',headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)});
     if(!deleted.ok)return false;
     const readback=await fetch('https://picklog.devislife.com/api/captures',{headers,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!readback.ok)return false;
     const data=await readback.json();return Array.isArray(data.images) && !data.images.some(x=>x.public_id===publicId);
    },ownedId);}catch{}
  }
  if(worker)await worker.evaluate(()=>configureConnection({type:'element-inspector:disconnect'})).catch(()=>{});
  if(context)await context.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});
 }
 result.cleanup=cleanup || !ownedId;if(!result.cleanup)result.passed=false;
 fs.writeFileSync(path.join(out,area?'picklog-area-live-receipt.json':'picklog-live-receipt.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
})().catch(()=>{console.log(JSON.stringify({passed:false,error:'verification_failed',cleanup:false}));process.exitCode=1;});
