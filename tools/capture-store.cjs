// Store preparation: real packaged MV3 on a clearly labelled synthetic webpage.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ext = path.join(root, 'output/element-inspector');
const store = path.join(root, 'store');
const out = path.join(store, 'screenshots');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

(async () => {
  assert.ok(process.env.QA_DIR, 'Set QA_DIR to a verified temporary evidence directory');
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(process.env.QA_DIR, { recursive: true });
  const profile = fs.mkdtempSync(path.join(process.env.QA_DIR, 'store-profile-'));
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(store, 'demo/index.html')));
  });
  let context;
  const errors = [], externalRequests = [];
  const receipt = {
    startedAt: new Date().toISOString(), viewport: { width: 1280, height: 800 },
    origin: 'labelled synthetic demo on localhost, genuine packaged extension; no mocked extension responses',
    fixtureSha256: sha(path.join(store, 'demo/index.html')),
    version: JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'))).version,
    manifestSha256: sha(path.join(ext, 'manifest.json')), screenshots: [], checks: [],
    zipSha256: sha(path.join(root, 'output', `element-inspector-${JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'))).version}.zip`)),
  };
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: receipt.viewport, deviceScaleFactor: 1,
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    });
    context.setDefaultTimeout(10000);
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    context.on('request', req => {
      if (/^https?:/.test(req.url()) && new URL(req.url()).hostname !== '127.0.0.1') externalRequests.push(req.url());
    });
    const manager = await context.newPage();
    await manager.goto('chrome://extensions');
    const registered = await manager.evaluate(() => {
      const item = [...document.querySelector('extensions-manager').shadowRoot
        .querySelector('extensions-item-list').shadowRoot.querySelectorAll('extensions-item')]
        .find(x => x.data.name === '엘리먼트 검사기');
      return { id: item?.data.id, iconUrl: item?.data.iconUrl };
    });
    assert.ok(registered.id, 'Packaged extension registered');
    receipt.extensionId = registered.id;
    receipt.managementIcon = { embeddedPng: registered.iconUrl?.startsWith('data:image/png;'), renderedCapture: 'branding/installed-management-icon.png' };
    await manager.locator('extensions-item').filter({ hasText: '엘리먼트 검사기' })
      .locator('img#icon').screenshot({ path: path.join(store, 'branding/installed-management-icon.png') });
    receipt.checks.push('Real Chrome extensions-management icon rendered');
    const iconCheck = await context.newPage();
    const iconRows = ['#ffffff', '#182332'].map(bg => `<div style="background:${bg};padding:24px;display:flex;align-items:center;gap:32px">` +
      [16, 32, 48, 128].map(size => `<img width="${size}" height="${size}" src="data:image/png;base64,${fs.readFileSync(path.join(root, `icons/icon-${size}.png`)).toString('base64')}">`).join('') + '</div>').join('');
    await iconCheck.setContent(`<body style="margin:0">${iconRows}</body>`);
    await iconCheck.screenshot({ path: path.join(process.env.QA_DIR, 'icon-light-dark.png') });
    await iconCheck.close();
    receipt.checks.push('Icon variants rendered at native 16/32/48/128px on light and dark backgrounds');
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.goto(origin + '/demo');
    const target = page.locator('#save-request');
    await target.hover();
    await page.keyboard.press('Alt+Shift+E');
    const overlay = page.locator('devis-element-inspector');
    await overlay.locator('[data-tooltip]').filter({ hasText: 'save-request' }).waitFor();
    async function shot(name, sourcePage, claim) {
      const file = path.join(out, name);
      await sourcePage.screenshot({ path: file });
      receipt.screenshots.push({ file: 'screenshots/' + name, sha256: sha(file), claim });
    }
    await shot('01-element-highlight.png', page, 'Actual inspector hover overlay on a labelled demo webpage');
    await target.click();
    await overlay.getByText('복사했습니다', { exact: false }).waitFor();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /CSS: #save-request/);
    assert.match(copied, /문서 제목: 요소 검사 예제/);
    await page.locator('#copy-result').focus();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    assert.equal(await page.locator('#copy-result').inputValue(), copied, 'Real clipboard paste matches copy');
    await overlay.waitFor({ state: 'detached' });
    await page.mouse.move(1200, 740);
    await shot('02-copy-result.png', page, 'Actual copied clipboard text pasted into the demo page, not a built-in extension editor');
    receipt.checks.push('Default shortcut, highlight, click, real clipboard readback/paste and end-of-inspection');
    const settings = await context.newPage();
    await settings.goto(`chrome-extension://${registered.id}/options.html`);
    await settings.waitForFunction(() => document.querySelectorAll('input[name="copy-field"]:checked').length === 11);
    await settings.locator('#shortcut').waitFor();
    await shot('03-copy-settings.png', settings, 'Actual extension settings page, default shortcut and all 11 fields');
    receipt.checks.push('11 default copy fields and actual settings page');
    // Report what redaction does and does not do; only synthetic markers are used.
    await page.bringToFront();
    await page.goto(origin + '/path-SYNTHETIC_PRIVATE?access_token=REDACT_ME&opaque=KEEP_SYNTHETIC');
    await target.hover();
    await page.keyboard.press('Alt+Shift+E');
    await overlay.locator('[data-tooltip]').filter({ hasText: 'save-request' }).waitFor();
    await target.click();
    const probe = await page.evaluate(() => navigator.clipboard.readText());
    assert.doesNotMatch(probe, /REDACT_ME|access_token/);
    assert.match(probe, /path-SYNTHETIC_PRIVATE/);
    assert.match(probe, /opaque=KEEP_SYNTHETIC/);
    receipt.redactionProbe = {
      knownAuthenticationParameterRemoved: true, urlPathAndUnknownParameterRetained: true,
      syntheticOnly: true, implication: 'Do not promise complete secret/privacy redaction',
    };
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    receipt.browser = context.browser()?.version() || 'persistent Chromium';
    receipt.checks.push('No observed page errors or off-origin HTTP requests in this local demo run');
    receipt.passed = true;
  } finally {
    if (context) await context.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
    receipt.finishedAt = new Date().toISOString();
    receipt.cleanup = 'Owned browser/server stopped; temporary profile removed';
    receipt.pageErrors = errors;
    fs.writeFileSync(path.join(store, 'capture-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  }
  console.log(JSON.stringify(receipt));
})().catch(err => { console.error(err); process.exitCode = 1; });
