// Ideas 61793/61794: rendered-tab identity, explicit drag and actual PNG clipboard in MV3 Chromium.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const { pressAreaShortcut } = require('./area-shortcut.cjs');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

async function main() {
  const out = process.env.QA_DIR;
  assert.ok(out, 'QA_DIR required');
  const root = process.env.EXTENSION_DIR || path.resolve(__dirname, '..');
  const visual = process.env.VISUAL_ONLY || process.env.REPRO_ONLY;
  const sizes = [[1920, 1080], [1024, 768], [390, 844]];
  const viewport = visual ? { width: 1920, height: 1080 } : null;
  const profile = fs.mkdtempSync(path.join(out, 'area-profile-'));
  let releaseResource;
  const server = http.createServer((req, res) => {
    if (req.url === '/slow.png') {
      releaseResource = () => res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><title>캡처 검증</title>
      <style>body{margin:0;font:18px system-ui;background:#f1f5f9}
      h1{margin:32px} #target{position:absolute;left:140px;top:130px;width:240px;height:150px;
      background:linear-gradient(90deg,#27a35b 50%,#1749a1 50%);border:0;color:white;text-align:left;padding:16px}
      </style><h1 tabindex="-1">선택 영역 검증</h1>
      <button id="target" onclick="window.businessClicks++">검증용 영역</button>
      <script>window.businessClicks=0</script>
      ${req.url === '/loading' ? '<img hidden src="/slow.png">' : ''}`);
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: false, viewport,
      args: ['--window-size=1280,900', '--force-device-scale-factor=1', `--disable-extensions-except=${root}`, `--load-extension=${root}`, '--host-resolver-rules=MAP capture.test 127.0.0.1'],
    });
    context.setDefaultTimeout(6000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    if (!process.env.VISUAL_ONLY) {
      const management = await context.newPage();
      await management.goto('chrome://extensions');
      await management.evaluate(id => chrome.developerPrivate.addHostPermission(id, '<all_urls>'), id);
      await management.close();
      const options = await context.newPage();
      await options.goto(`chrome-extension://${id}/options.html`);
      await options.waitForFunction(() => !document.querySelector('#copy-fields').disabled);
      await options.locator('#capture-enabled').check();
      await expect.poll(() => worker.evaluate(() => chrome.permissions.contains({ origins: ['<all_urls>'] }))).toBe(true);
      await options.getByRole('button', { name: '저장', exact: true }).click();
      await expect(options.locator('#settings-status')).toContainText('저장했습니다');
      await options.close();
    }
    const page = await context.newPage();
    await context.grantPermissions(['clipboard-read'], { origin });
    await page.goto(origin + '/loading', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => Boolean(releaseResource)).toBe(true);
    await page.bringToFront();
    const target = page.locator('#target');
    const status = page.locator('devis-element-inspector [role=status]').first();
    const activeTab = () => worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]);
    const inspect = async () => {
      await target.hover();
      await page.keyboard.press('Alt+Shift+E');
      await target.click();
    };
    if (process.env.VISUAL_ONLY) {
      releaseResource();
      await page.waitForLoadState('load');
    } else {
      assert.equal((await activeTab()).status, 'loading', 'The visible element belongs to the active loading tab');
      await inspect();
      if (process.env.REPRO_ONLY) {
        await expect(status).toContainText('검사하던 탭이 바뀌었습니다');
        assert.equal((await activeTab()).status, 'loading');
        releaseResource();
        await page.waitForLoadState('load');
        await page.keyboard.press('Escape');
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          await page.locator('h1').focus();
          await page.keyboard.press('Alt+Shift+W');
          await page.mouse.move(160, 160);
          await page.screenshot({ path: path.join(out, 'baseline-' + width + '.png') });
          assert.equal(await page.locator('[data-area]').count(), 0);
        }
        console.log('Reproduced: same visible loading tab rejected as changed. No area shortcut in baseline.');
        return;
      }
      await expect(status).toContainText('이미지를 캡처했습니다');
      assert.equal((await activeTab()).status, 'loading');
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /CSS: #target/);
      releaseResource();
      await page.waitForLoadState('load');
      await page.keyboard.press('Escape');
      if (!visual) {
        // Delay only the return of the real screenshot so a real tab activation happens in flight.
        const other = await context.newPage();
        await other.goto(origin + '/other');
        await page.bringToFront();
        await worker.evaluate(() => {
          const original = chrome.tabs.captureVisibleTab;
          chrome.tabs.captureVisibleTab = async (...args) => {
            const png = await original(...args);
            chrome.tabs.captureVisibleTab = original;
            await new Promise(resolve => { self.releaseCapturedTab = resolve; });
            return png;
          };
        });
        await inspect();
        await expect.poll(() => worker.evaluate(() => typeof self.releaseCapturedTab)).toBe('function');
        const originalId = (await activeTab()).id;
        await other.bringToFront();
        await expect.poll(async () => (await activeTab()).id).not.toBe(originalId);
        await page.bringToFront();
        await expect.poll(async () => (await activeTab()).id).toBe(originalId);
        await worker.evaluate(() => self.releaseCapturedTab());
        await expect(status).toContainText('검사하던 탭이 바뀌었습니다');
        assert.match(await page.evaluate(() => navigator.clipboard.readText()), /CSS: #target/);
        await expect(page.getByRole('button', { name: '이미지 보기·복사' })).toHaveCount(0);
        await other.close();
        await page.keyboard.press('Escape');
      }
      await worker.evaluate(() => chrome.storage.local.set({ captureEnabled: false }));
      assert.equal(await worker.evaluate(() => chrome.permissions.remove({ origins: ['<all_urls>'] })), true);

    }

    const expectImage = async (width, height) => {
      await expect.poll(() => page.evaluate(async () => {
        const item = (await navigator.clipboard.read()).find(entry => entry.types.includes('image/png'));
        if (!item) return null;
        const bitmap = await createImageBitmap(await item.getType('image/png'));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const g = canvas.getContext('2d');
        g.drawImage(bitmap, 0, 0);
        return { size: [bitmap.width, bitmap.height],
          left: [...g.getImageData(0, 0, 1, 1).data],
          right: [...g.getImageData(bitmap.width - 1, 0, 1, 1).data] };
      }), { timeout: 2000 }).toEqual({ size: [width, height], left: [39, 163, 91, 255], right: [23, 73, 161, 255] });
    };
    const shortcut = await worker.evaluate(() => chrome.commands.getAll());
    assert.match(shortcut.find(entry => entry.name === 'capture-area')?.shortcut || '', /^(Alt\+Shift\+W|⌥⇧W)$/);
    await worker.evaluate(() => {
      self.testCommands = [];
      const crop = ElementInspectorCapture.cropRegion;
      ElementInspectorCapture.cropRegion = (rect, viewport, bitmap) => {
        try { return crop(rect, viewport, bitmap); }
        catch (error) { self.testCrop = { rect, viewport, image: [bitmap.width, bitmap.height] }; throw error; }
      };
      chrome.commands.onCommand.addListener((command, tab) => self.testCommands.push([command, tab?.id]));
    });
    const start = async () => {
      await pressAreaShortcut(page, worker, profile);
      await expect(page.locator('[data-area]')).toBeVisible().catch(async error => {
        console.error('Commands and focus:', await worker.evaluate(() => self.testCommands),
          await page.evaluate(() => [document.visibilityState, document.hasFocus()]));
        throw error;
      });
    };
    const select = async (reverse, screenshot) => {
      const from = reverse ? [360, 260] : [160, 160];
      const to = reverse ? [160, 160] : [360, 260];
      await page.mouse.move(...from);
      await page.mouse.down();
      await page.mouse.move(...to, { steps: 4 });
      if (screenshot) await page.screenshot({ path: path.join(out, screenshot) });
      await page.mouse.up();
    };

    if (visual) {
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        await start();
        await page.mouse.move(360, 260);
        await page.mouse.down();
        await page.mouse.move(160, 160, { steps: 4 });
        await page.screenshot({ path: path.join(out, 'implementation-' + width + '.png') });
        await page.keyboard.press('Escape');
        await page.mouse.up();
        await expect(page.locator('[data-area]')).toHaveCount(0);
      }
      return;
    }
    await start();
    await select(true);
    await expect(status).toContainText('이미지를 클립보드에 복사했습니다');
    await expectImage(200, 100);
    assert.equal(await page.evaluate(() => window.businessClicks), 0, 'Drag must never click the page');
    await start();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-area]')).toHaveCount(0);
    await expectImage(200, 100);
    await start();
    const other = await context.newPage();
    await other.goto(origin + '/other');
    await other.bringToFront();
    await expect(page.locator('[data-area]')).toHaveCount(0);
    await page.bringToFront();
    await expect(page.locator('[data-area]')).toHaveCount(0);
    await expectImage(200, 100);
    let posts = 0, reads = 0, finishUpload, uploaded, rejectUpload = false;
    const publicId = 'cap_61794areaCaptureExample';
    await context.route('https://picklog.devislife.com/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      assert.equal(request.headers()['x-picklog-token'], 'synthetic-area-pat');
      if (url.pathname === '/api/issue-projects') return route.fulfill({ json: { projects: [{ project_key: 'DEV' }] } });
      if (url.pathname === '/api/captures' && request.method() === 'GET') return route.fulfill({ json: { images: [] } });
      if (url.pathname === '/api/captures' && request.method() === 'POST') {
        posts++;
        if (rejectUpload) return route.fulfill({ status: 403, json: {} });
        const raw = request.postDataBuffer();
        const boundary = request.headers()['content-type'].split('boundary=')[1];
        const start = raw.indexOf(Buffer.from('Content-Type: image/png\r\n\r\n')) + 'Content-Type: image/png\r\n\r\n'.length;
        const end = raw.indexOf(Buffer.from('\r\n--' + boundary), start);
        uploaded = raw.subarray(start, end);
        assert.match(raw.toString('latin1'), /name="projectKey"\r\n\r\nDEV/);
        await new Promise(resolve => { finishUpload = resolve; });
        return route.fulfill({ status: 201, json: { image: { public_id: publicId, issue_project_key: 'DEV' } } });
      }
      if (url.pathname === '/api/captures/' + publicId + '/asset' && url.search === '?kind=original') {
        reads++;
        return route.fulfill({ body: uploaded, contentType: 'image/png' });
      }
      throw Error('Unexpected Picklog request');
    });
    const grant = await context.newPage();
    await grant.goto('chrome://extensions');
    await grant.evaluate(id => chrome.developerPrivate.addHostPermission(id, 'https://picklog.devislife.com/*'), id);
    await grant.close();
    const settings = await context.newPage();
    await settings.goto(`chrome-extension://${id}/options.html`);
    await settings.locator('#advanced summary').click();
    await settings.locator('#picklog-pat').fill('synthetic-area-pat');
    await settings.locator('#picklog-project').fill('DEV');
    await settings.getByRole('button', { name: '저장', exact: true }).click();
    await expect(settings.locator('#picklog-summary')).toContainText('PAT 저장됨');
    await settings.close();

    await start();
    await select(false);
    await expect(status).toContainText('이미지를 클립보드에 복사했습니다').catch(async error => {
      console.error('Crop dimensions:', await worker.evaluate(() => self.testCrop));
      throw error;
    });
    await expectImage(200, 100);
    await expect.poll(() => Boolean(finishUpload)).toBe(true);
    assert.equal(reads, 0, 'Clipboard completes independently of Picklog response');
    finishUpload();
    await expect(status).toContainText(publicId);
    assert.deepEqual([posts, reads], [1, 1]);
    assert.equal(uploaded.readUInt32BE(16), 200);
    assert.equal(uploaded.readUInt32BE(20), 100);
    await page.screenshot({ path: path.join(out, 'area-result.png') });

    rejectUpload = true;
    await start();
    await select(false);
    await expect(status).toContainText('Picklog 캔버스·프로젝트');
    await expect(status).toContainText('이미지를 클립보드에 복사했습니다');
    await expectImage(200, 100);
    assert.deepEqual([posts, reads], [2, 1]);

    await worker.evaluate(() => configureConnection({ type: 'element-inspector:disconnect' }));
    await page.goto(origin.replace('127.0.0.1', 'capture.test') + '/insecure');
    assert.equal(await page.evaluate(() => window.isSecureContext), false);
    await start();
    const previewOpened = context.waitForEvent('page');
    await select(false);
    const preview = await previewOpened;
    await expect(preview.locator('h1')).toHaveText('캡처한 영역');
    await expect(preview.getByRole('status')).toContainText('이미지를 클립보드에 복사했습니다');
    await preview.close();
    await page.goto(origin);
    await page.bringToFront();
    await expectImage(200, 100);
    assert.deepEqual(errors, []);
    const checks = ['same loading tab', 'real tab switch across element capture', 'native shortcut', 'PNG pixels', 'forward and reverse drag', 'Escape',
      'tab activation cancellation', 'copy before upload', 'upload and permission denial', 'HTTP clipboard fallback'];
    fs.writeFileSync(path.join(out, 'area-browser-receipt.json'), JSON.stringify({ passed: true, checks, errors, posts, reads }, null, 2));
    console.log('PASS ' + checks.join(', '));
  } finally {
    if (context) await context.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
