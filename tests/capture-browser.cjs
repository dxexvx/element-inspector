// Idea61582: real installed MV3 capture/preview/clipboard; synthetic Picklog API sink.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR;if(!out)throw Error('QA_DIR required');
 const profile=fs.mkdtempSync(path.join(out,'capture-behavior-profile-'));

 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>요소 캡처 검증</title><style>body{margin:0;font:16px system-ui}h1{margin:20px}#target{position:absolute;left:180px;top:160px;width:160px;height:100px;background:rgb(40,160,80);color:white;display:grid;place-items:center}#clipped{position:absolute;left:-20px;top:360px;width:80px;height:40px;background:#c04040}iframe{position:absolute;top:460px;left:80px;height:100px}button{width:120px;height:40px}</style><h1 tabindex="-1">검증용 화면</h1><div id="target">캡처 대상</div><div id="clipped">잘림</div>'+ (req.url==='/frame'?'<button id="frame-target">프레임</button>':'<iframe src="/frame"></iframe>')+'<script>window.businessClicks=0;document.querySelector("#target").onclick=()=>window.businessClicks++</script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let context;
 try{
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:false,viewport:null,args:['--window-size=1280,900',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 context.setDefaultTimeout(10000);const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
 const management=await context.newPage();await management.goto('chrome://extensions');await management.evaluate(id=>chrome.developerPrivate.addHostPermission(id,'<all_urls>'),id);await management.close();
 const options=await context.newPage();await options.goto(`chrome-extension://${id}/options.html`);
 await options.waitForFunction(()=>!document.querySelector('#copy-fields').disabled);
 await options.locator('#capture-enabled').check();
 assert.equal(await options.locator('#capture-enabled').isChecked(),true,'Real optional permissions request must be granted by test Chrome');
 await require('@playwright/test').expect.poll(()=>worker.evaluate(()=>chrome.permissions.contains({origins:['<all_urls>']})),{timeout:10000}).toBe(true);
 await options.getByRole('button',{name:'저장',exact:true}).click();await options.locator('#settings-status').filter({hasText:'저장했습니다'}).waitFor();await options.reload();assert.ok(await options.locator('#capture-enabled').isChecked());

 const url=`http://127.0.0.1:${server.address().port}/`,page=await context.newPage();await page.goto(url);await context.grantPermissions(['clipboard-read'],{origin:new URL(url).origin});
 const overlay=page.locator('devis-element-inspector'),target=page.locator('#target');
 const clickCapture=async locator=>{await worker.evaluate(async()=>{const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});await chrome.windows.update(tab.windowId,{focused:true});});await page.bringToFront();await page.locator('h1').focus();await locator.hover();await page.keyboard.press('Alt+Shift+E');await locator.click();};
 const clipboardImage=async()=>page.evaluate(async()=>{
   const items=await navigator.clipboard.read(),item=items.find(x=>x.types.includes('image/png'));if(!item)return null;
   const data=new Uint8Array(await (await item.getType('image/png')).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);
 });
 const previewAndCopy=async()=>{
   const opened=context.waitForEvent('page');await overlay.getByRole('button',{name:'이미지 보기·복사',exact:true}).click();const preview=await opened;
   await preview.locator('#copy:not(:disabled)').waitFor();await preview.bringToFront();await preview.getByRole('button',{name:'이미지·정보 복사',exact:true}).click();await preview.getByRole('status').filter({hasText:'이미지와 정보를 복사했습니다'}).waitFor();await preview.screenshot({path:path.join(out,'capture-preview-result.png')});await preview.close();await page.bringToFront();return Buffer.from(await clipboardImage(),'base64');
 };
 const expected=await target.screenshot();fs.writeFileSync(path.join(out,'expected-element.png'),expected);
 await clickCapture(target);await overlay.getByText('이미지를 캡처했습니다',{exact:false}).waitFor();const local=path.join(out,'local-element.png');fs.writeFileSync(local,await previewAndCopy());
 const png=fs.readFileSync(local);assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[expected.readUInt32BE(16),expected.readUInt32BE(20)]);const scale=png.readUInt32BE(16)/160;
 const pixel=await page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);return [...c.getContext('2d').getImageData(0,0,1,1).data];},png.toString('base64'));
 const identical=await page.evaluate(async images=>{const pixels=async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);return canvas.getContext('2d').getImageData(0,0,image.width,image.height).data;};const [a,b]=await Promise.all(images.map(pixels));return a.length===b.length && a.every((value,i)=>value===b[i]);},[expected.toString('base64'),png.toString('base64')]);assert.ok(identical,'Entire crop must equal the real element without inspector UI');
 assert.deepEqual(pixel,[40,160,80,255],'Inspector highlight and tooltip must not be burned into image');
 assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/CSS: #target/);assert.equal(await page.evaluate(()=>window.businessClicks),0);
 await page.screenshot({path:path.join(out,'capture-local-result.png')});
 await clickCapture(page.locator('#clipped'));await overlay.getByText('이미지를 캡처했습니다',{exact:false}).waitFor();fs.writeFileSync(path.join(out,'clipped-element.png'),await previewAndCopy());const clippedBytes=fs.readFileSync(path.join(out,'clipped-element.png'));assert.deepEqual([clippedBytes.readUInt32BE(16),clippedBytes.readUInt32BE(20)],[60*scale,40*scale]);
 let mode='success',posts=0,assetReads=0,uploaded,delay=0;
 const publicId='cap_01m7testcapture1234567890abc';
 await context.route('https://picklog.devislife.com/**',async route=>{
   const request=route.request(),url=new URL(request.url());
   assert.equal(request.headers()['x-picklog-token'],'synthetic-pat-61582');
   if(url.pathname==='/api/captures' && request.method()==='GET')return route.fulfill({json:{images:[]}});
   if(request.method()==='POST'){
     posts++;if(delay)await new Promise(r=>setTimeout(r,delay));
     if(mode==='denied')return route.fulfill({status:403,json:{error:'forbidden'}});
     const raw=request.postDataBuffer(),boundary=request.headers()['content-type'].split('boundary=')[1];
     const fileStart=raw.indexOf(Buffer.from('Content-Type: image/png\r\n\r\n'))+'Content-Type: image/png\r\n\r\n'.length;
     const fileEnd=raw.indexOf(Buffer.from('\r\n--'+boundary),fileStart);uploaded=raw.subarray(fileStart,fileEnd);
     assert.equal(uploaded.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.match(raw.toString('latin1'),/name="projectKey"\r\n\r\nDEV/);
     return route.fulfill({status:201,json:{image:{public_id:publicId,issue_project_key:'DEV'}}});
   }
   if(url.pathname===`/api/captures/${publicId}/asset`){assetReads++;return route.fulfill({contentType:'image/png',body:mode==='changed'?Buffer.from('wrong image'):uploaded});}
   throw Error('Unexpected API operation');
 });
 await options.bringToFront();await options.locator('#advanced').evaluate(el=>el.open=true);await options.locator('#picklog-pat').fill('synthetic-pat-61582');await options.locator('#picklog-project').fill('DEV');await options.getByRole('button',{name:'Picklog 연결',exact:true}).click();await options.locator('#connection-status').filter({hasText:'Picklog에 연결했습니다'}).waitFor();
 assert.equal(await options.locator('#picklog-pat').inputValue(),'');await options.reload();await options.locator('#advanced').evaluate(el=>el.open=true);await options.locator('#connection-status').filter({hasText:'Picklog에 연결했습니다'}).waitFor();
 const localData=await worker.evaluate(()=>chrome.storage.local.get(null));assert.ok(!JSON.stringify(localData).includes('synthetic-pat-61582'));
 await clickCapture(target);await overlay.getByText('캡처를 업로드하고 참조 ID를 복사했습니다',{exact:false}).waitFor().catch(async error=>{console.log({message:await overlay.locator('[data-tooltip]').textContent(),posts,assetReads});throw error;});const text=await page.evaluate(()=>navigator.clipboard.readText());assert.match(text,new RegExp(publicId));assert.match(text,/CSS: #target/);assert.equal(posts,1);assert.equal(assetReads,1);assert.deepEqual([uploaded.readUInt32BE(16),uploaded.readUInt32BE(20)],[expected.readUInt32BE(16),expected.readUInt32BE(20)]);await page.screenshot({path:path.join(out,'capture-upload-result.png')});
 // The real isolated content world cannot read session PAT or issue settings messages.
 const client=await context.newCDPSession(page),worlds=[];client.on('Runtime.executionContextCreated',e=>worlds.push(e.context));await client.send('Runtime.enable');const isolated=worlds.find(x=>x.origin===`chrome-extension://${id}`);assert.ok(isolated);
 const sessionAccess=await client.send('Runtime.evaluate',{contextId:isolated.id,expression:'(async()=>{try{await chrome.storage.session.get("picklogConnection");return false;}catch{return true;}})()',awaitPromise:true,returnByValue:true});assert.equal(sessionAccess.result.value,true);
 const deniedSettings=await client.send('Runtime.evaluate',{contextId:isolated.id,expression:'chrome.runtime.sendMessage({type:"element-inspector:connection"}).then(x=>x.ok)',awaitPromise:true,returnByValue:true});assert.equal(deniedSettings.result.value,false);await client.detach();
 mode='denied';await clickCapture(target);await overlay.getByText('Picklog 캔버스·프로젝트',{exact:false}).waitFor();assert.doesNotMatch(await page.evaluate(()=>navigator.clipboard.readText()),/Picklog 캔버스 ID/);assert.equal(posts,2);assert.equal(assetReads,1);
 mode='changed';await clickCapture(target);await overlay.getByText('업로드 결과를 확인하지 못했습니다',{exact:false}).waitFor();assert.doesNotMatch(await page.evaluate(()=>navigator.clipboard.readText()),/Picklog 캔버스 ID/);assert.equal(posts,3);
 mode='success';const child=page.frameLocator('iframe').locator('#frame-target');await clickCapture(child);await page.frameLocator('iframe').locator('devis-element-inspector').getByText('프레임 안 요소는',{exact:false}).waitFor();assert.equal(posts,3,'Unsupported frame must never upload a wrong crop');
 await options.bringToFront();await options.getByRole('button',{name:'연결 해제',exact:true}).click();await options.locator('#connection-status').filter({hasText:'연결 없음'}).waitFor();assert.equal(await worker.evaluate(async()=>Boolean((await chrome.storage.session.get('picklogConnection')).picklogConnection)),false);
 for(const [kind,width,height] of [['desktop',1920,1080],['tablet',1024,768],['mobile',390,844]]){
   await options.setViewportSize({width,height});await options.locator('#advanced').evaluate(el=>el.open=true);await options.screenshot({path:path.join(out,`capture-advanced-${kind}.png`),fullPage:true});assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'capture-receipt.json'),JSON.stringify({passed:true,extensionId:id,checks:['optional permissions','capture setting readback without downloads','real image clipboard pixels','viewport clipping','business click blocked','PAT session only','connection reload','single upload and byte readback','actual reference clipboard','content credential denial','auth failure fallback','readback mismatch fallback','iframe fallback','disconnect','responsive advanced settings'],posts,assetReads,pixel,errors},null,2));
 console.log(JSON.stringify({passed:true,checks:15,posts,assetReads,pixel}));
 }finally{if(context)await context.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
