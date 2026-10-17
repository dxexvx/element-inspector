// Idea 54161: prove loaded MV3 behavior and actual clipboard, not a page-injected mock.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
(async () => {
  const root = path.resolve(__dirname, '..');
  const extensionRoot=process.env.EXTENSION_DIR || root;
  assert.ok(fs.existsSync(path.join(root, 'manifest.json')), 'Installable MV3 manifest must exist');
  const out = process.env.QA_DIR;
  if (!out) throw Error('Set QA_DIR to a verified external artifact directory');
  fs.mkdirSync(out, { recursive: true });
  const profile = fs.mkdtempSync(path.join(out, 'profile-'));
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(__dirname, 'fixture.html')));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: {width:1920,height:1080},
      args: [`--disable-extensions-except=${extensionRoot}`, `--load-extension=${extensionRoot}`],
    });
    context.setDefaultTimeout(7000);
    const errors = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const url = page.url();
    await context.grantPermissions(['clipboard-read'], {origin: new URL(url).origin});
    // A content script is the extension's real execution surface (no worker required).
    const extensions = await context.newPage();
    await extensions.goto('chrome://extensions');
    const extensionId = await extensions.evaluate(() => {
      const manager=document.querySelector('extensions-manager');
      const list=manager.shadowRoot.querySelector('extensions-item-list');
      return [...list.shadowRoot.querySelectorAll('extensions-item')].find(x=>x.data.name==='엘리먼트 검사기')?.data.id;
    });
    assert.ok(extensionId, 'Chrome must register the unpacked extension');
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.locator('#shortcut').press('Control+Shift+Y');
    await options.getByRole('button', {name:'저장',exact:true}).click();
    await options.getByRole('status').filter({hasText:'저장했습니다'}).waitFor();
    await options.reload();
    assert.equal(await options.locator('#shortcut').inputValue(), 'Ctrl + Shift + Y');
    await options.screenshot({path:path.join(out,'implementation-settings.png')});
    await page.bringToFront();
    const target = page.locator('[id="save:button"]');
    await target.hover();
    await page.screenshot({path:path.join(out,'baseline-desktop.png')});
    await page.keyboard.press('Control+Shift+Y');
    const overlay = page.locator('devis-element-inspector');
    await overlay.waitFor();
    assert.match(await overlay.locator('[data-tooltip]').innerText(), /save:button/);
    assert.match(await overlay.locator('[data-tooltip]').innerText(), /primary/);
    assert.equal(await page.frameLocator('iframe').locator('devis-element-inspector [data-tooltip]').isVisible(),false,'Inactive pointer frames must not show stale tooltips');
    const rect = await target.boundingBox();
    const highlight = await overlay.locator('[data-highlight]').boundingBox();
    assert.ok(Math.abs(rect.x-highlight.x)<1 && Math.abs(rect.width-highlight.width)<1,'Highlight follows hovered geometry');
    await page.screenshot({path:path.join(out,'implementation-desktop.png')});
    await target.click();
    await overlay.getByText('복사했습니다', {exact:false}).waitFor();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /save\\:button/);
    assert.equal(await page.evaluate(s => document.querySelector(s)?.id,copied), 'save:button');
    assert.equal(await page.evaluate(()=>window.downCount),0,'Inspect pointerdown must not trigger business handler');
    assert.equal(await page.evaluate(()=>window.clickCount),0,'Inspect click must not trigger business handler');
    await target.click();
    assert.equal(await page.evaluate(()=>window.clickCount),1,'Normal click restored after copy');
    await page.keyboard.press('Control+Shift+Y');
    await page.keyboard.press('Escape');
    await overlay.waitFor({state:'detached'});
    await page.locator('.repeated').nth(1).hover();
    await page.keyboard.press('Control+Shift+Y');
    await page.locator('.repeated').nth(1).click();
    const repeated = await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(await page.evaluate(s=>document.querySelectorAll(s).length,repeated),1,'Duplicate classes need exact selector');
    assert.equal(await page.evaluate(s=>document.querySelector(s)?.textContent,repeated),'두 번째 반복 요소');
    await page.keyboard.press('Control+Shift+Y');
    await page.locator('article p').hover();
    await page.locator('article p').click();
    const plain = await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(await page.evaluate(s=>document.querySelector(s)?.textContent,plain),'식별자가 없는 문단');
    await page.reload();
    await target.hover();
    await page.keyboard.press('Alt+Shift+E');
    assert.equal(await overlay.count(),0,'Old shortcut no longer activates');
    await page.keyboard.press('Control+Shift+Y');
    await overlay.waitFor();
    await page.keyboard.press('Escape');
    await page.locator('input').focus();
    await page.keyboard.press('Control+Shift+Y');
    assert.equal(await overlay.count(),0,'Inactive inspector must not steal editor shortcuts');
    await page.locator('input').blur();
    await page.setViewportSize({width:390,height:844});
    await page.locator('#edge').hover();
    await page.screenshot({path:path.join(out,'baseline-mobile.png')});
    await page.keyboard.press('Control+Shift+Y');
    await page.screenshot({path:path.join(out,'implementation-mobile.png')});
    const tooltip = await overlay.locator('[data-tooltip]').boundingBox();
    assert.ok(tooltip.x>=0 && tooltip.x+tooltip.width<=391,'Tooltip stays within narrow viewport');
    await page.keyboard.press('Escape');
    await options.setViewportSize({width:390,height:844});
    await options.screenshot({path:path.join(out,'implementation-settings-mobile.png')});
    assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    console.log('primary checks passed');
    // Broadcast inspection follows the pointer into a frame, then ends in every frame.
    await page.setViewportSize({width:1920,height:1080});
    await page.bringToFront();
    await target.hover();
    await page.keyboard.press('Control+Shift+Y');
    const child = page.frameLocator('iframe').locator('#frame-button');
    await child.click();
    console.log('iframe clicked');
    const frameCopy=await page.evaluate(()=>navigator.clipboard.readText());
    assert.match(frameCopy,/iframe: http:\/\/127\.0\.0\.1:/);
    assert.match(frameCopy,/#frame-button/);
    await target.click();
    assert.equal(await page.evaluate(()=>window.clickCount),1,'Frame copy also stops top inspection');
    await page.locator('#shadow-host').locator('button').hover();
    await page.keyboard.press('Control+Shift+Y');
    await page.locator('#shadow-host').locator('button').click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'#shadow-host >>> #shadow-button');
    console.log('shadow checks passed');
    // Exercise an actual clipboard failure in the extension's isolated execution context.
    const client=await context.newCDPSession(page);
    const worlds=[];client.on('Runtime.executionContextCreated',e=>worlds.push(e.context));
    await client.send('Runtime.enable');
    const {frameTree}=await client.send('Page.getFrameTree');
    const isolated=worlds.find(x=>x.origin===`chrome-extension://${extensionId}` && x.auxData?.frameId===frameTree.frame.id);
    assert.ok(isolated,'Extension isolated execution context exists');
    await client.send('Runtime.evaluate',{contextId:isolated.id,expression:'globalThis.savedCopy=document.execCommand;document.execCommand=()=>false'});
    await target.hover();await page.keyboard.press('Control+Shift+Y');await target.click();
    await overlay.getByText('복사하지 못했습니다.',{exact:false}).waitFor();
    await page.keyboard.press('Escape');
    await client.send('Runtime.evaluate',{contextId:isolated.id,expression:'document.execCommand=globalThis.savedCopy;delete globalThis.savedCopy'});
    console.log('copy failure checked');
    // Tablet geometry under the same route and data.
    await page.setViewportSize({width:1024,height:768});await target.hover();
    await page.screenshot({path:path.join(out,'baseline-tablet.png')});
    await page.keyboard.press('Control+Shift+Y');await overlay.waitFor();
    assert.equal(await page.frameLocator('iframe').locator('devis-element-inspector [data-tooltip]').isVisible(),false,'Pointer history must not reactivate frame tooltip');
    await page.screenshot({path:path.join(out,'implementation-tablet.png')});
    await page.keyboard.press('Escape');
    console.log('tablet checked');
    // Real popup route: the active page is queried through Chrome tabs, then receives the message.
    const popup=await context.newPage();await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.getByRole('button',{name:'검사 켜기·끄기'}).waitFor();
    await popup.screenshot({path:path.join(out,'implementation-popup.png')});
    await page.bringToFront();
    // Keep the inspected tab active, as it is while Chrome's real toolbar popup is open.
    await popup.evaluate(()=>document.querySelector('#toggle').click());
    await overlay.waitFor();await page.keyboard.press('Escape');
    await options.locator('#shortcut').press('a');
    await options.getByRole('status').filter({hasText:'함께 누르세요'}).waitFor();
    await options.getByRole('button',{name:'기본값 복원'}).click();
    await options.getByRole('button',{name:'저장',exact:true}).click();
    await options.getByRole('status').filter({hasText:'저장했습니다'}).waitFor();
    await page.bringToFront();await target.hover();await page.keyboard.press('Alt+Shift+E');await overlay.waitFor();await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    const comparison=await context.newPage();
    for(const [kind,width,height] of [['desktop',1920,1080],['tablet',1024,768],['mobile',390,844]]) {
      const data=name=>'data:image/png;base64,'+fs.readFileSync(path.join(out,name+'-'+kind+'.png')).toString('base64');
      await comparison.setViewportSize({width:width*2,height});
      await comparison.setContent(`<html style="margin:0"><body style="margin:0;display:flex"><img src="${data('baseline')}" width="${width}" height="${height}"><img src="${data('implementation')}" width="${width}" height="${height}"></body></html>`);
      await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
      await comparison.screenshot({path:path.join(out,'comparison-'+kind+'.png')});
    }
    const receipt={passed:true,extensionId,clipboard:{copied,repeated,plain},errors,checks:24};
    fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
    console.log(JSON.stringify(receipt));
  } finally {
    if(context) await context.close();
    server.close();
    fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
