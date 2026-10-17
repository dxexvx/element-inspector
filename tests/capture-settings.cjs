// Idea 54161: compare actual extension settings/menu before and after field toggles.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const out=process.env.QA_DIR,phase=process.env.CAPTURE_PHASE;
  if(!out || !['baseline','implementation'].includes(phase))throw Error('Set QA_DIR and CAPTURE_PHASE');
  fs.mkdirSync(out,{recursive:true});
  const profile=fs.mkdtempSync(path.join(out,'capture-profile-'));
  const root=path.resolve(__dirname,'..'),ext=process.env.EXTENSION_DIR || path.join(root,'output/element-inspector');
  let context;
  try{
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
    const page=await context.newPage();await page.goto('chrome://extensions');
    const id=await page.evaluate(()=>[...document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-item-list').shadowRoot.querySelectorAll('extensions-item')].find(x=>x.data.name==='엘리먼트 검사기').data.id);
    await page.goto(`chrome-extension://${id}/options.html`);
    await page.locator('#shortcut').press('Control+Shift+Y');await page.getByRole('button',{name:'저장',exact:true}).click();
    await page.getByRole('status').filter({hasText:'저장했습니다'}).waitFor();
    const receipt={phase,extensionId:id,viewports:[]};
    for(const [kind,width,height,route] of [['desktop',1920,1080,'options.html'],['tablet',1024,768,'options.html'],['mobile',390,844,'options.html'],['popup',320,600,'popup.html']]){
      await page.setViewportSize({width,height});await page.goto(`chrome-extension://${id}/${route}`);
      await page.locator('#shortcut').waitFor();
      if(route==='options.html')await page.waitForFunction(()=>document.querySelector('#shortcut').value==='Ctrl + Shift + Y');
      else await page.waitForFunction(()=>document.querySelector('#shortcut').textContent.includes('Ctrl + Shift + Y'));
      if(phase==='implementation')await page.locator('input[name=copy-field]').first().waitFor();
      await page.screenshot({path:path.join(out,`${phase}-fields-${kind}.png`)});
      const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,height:document.documentElement.scrollHeight,fields:[...document.querySelectorAll('input[name=copy-field]')].map(x=>({key:x.value,checked:x.checked,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}))}));
      if(geometry.overflow || (route==='popup.html' && geometry.height>600))throw Error(`Overflow: ${kind}`);
      receipt.viewports.push({kind,width,height,geometry});
      if(phase==='implementation'){
        const data=label=>'data:image/png;base64,'+fs.readFileSync(path.join(out,`${label}-fields-${kind}.png`)).toString('base64');
        const compare=await context.newPage();await compare.setViewportSize({width:width*2,height});
        await compare.setContent(`<body style="margin:0;display:flex"><img width="${width}" height="${height}" src="${data('baseline')}"><img width="${width}" height="${height}" src="${data('implementation')}"></body>`);
        await compare.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
        await compare.screenshot({path:path.join(out,`comparison-fields-${kind}.png`)});await compare.close();
      }
    }
    fs.writeFileSync(path.join(out,`${phase}-fields-receipt.json`),JSON.stringify(receipt,null,2));
    console.log(JSON.stringify({passed:true,phase,viewports:receipt.viewports.map(x=>x.kind)}));
  }finally{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
