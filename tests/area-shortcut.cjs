const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

async function pressAreaShortcut(page, worker, profile) {
  const windowId = await worker.evaluate(async () =>
    (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0].windowId);
  await worker.evaluate(id => chrome.windows.update(id, { focused: true }), windowId);
  await page.bringToFront();
  await page.locator('h1').focus();
  if (process.env.NATIVE_SHORTCUT) {
    // DevTools sends keystrokes to the document. Quartz delivers to the isolated browser's accelerator.
    const browser = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
      .split('\n').find(line => line.includes('--user-data-dir=' + profile) && !line.includes('--type='));
    assert.ok(browser, 'Isolated browser process');
    execFileSync(process.env.NATIVE_SHORTCUT, [browser.trim().split(/\s+/)[0]]);
  } else {
    await page.keyboard.press('Alt+Shift+W');
  }
}

module.exports = { pressAreaShortcut };
