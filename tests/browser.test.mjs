import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from '../scripts/server.mjs';

// Optional development-only tooling; no browser library ships with the page.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let server, browser, base;
before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: process.env.BROWSER_EXECUTABLE ? ['--no-sandbox'] : []
  });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

test('responsive layout, local assets, fonts, SVG icons and navigation', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(base)) failures.push(`External request: ${request.url()}`); });
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode(); }));
      });
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        missingSymbols: [...document.querySelectorAll('use')].filter(use => !document.querySelector(use.getAttribute('href'))).length,
        fonts: [...document.fonts].every(font => font.status === 'loaded'),
        missingAnchors: [...document.querySelectorAll('a[href^="#"]')].filter(a => a.hash && !document.querySelector(a.hash)).length
      }));
      assert.equal(result.overflow, false, `Horizontal overflow at ${width}`);
      assert.equal(result.missingSymbols, 0);
      assert.equal(result.fonts, true);
      assert.equal(result.missingAnchors, 0);
      assert.equal(await page.locator('.institute-link').getAttribute('href'), 'https://escolajovensdenegocios.com/');
      assert.equal(await page.locator('.institute-link').isVisible(), true);
      if (width === 390) {
        await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
        await page.locator('#navigation').getByText('Benefícios', { exact: true }).click();
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
        await page.locator('summary').nth(1).click();
        assert.notEqual(await page.locator('details').nth(1).getAttribute('open'), null);
      }
    }
    assert.deepEqual(failures, []);
  } finally { await page.close(); }
});

test('card supports hover, dragging both ways, keyboard, reset and reduced motion', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(base);
    await page.locator('.card-stage').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running'));
    const card = page.locator('.club-card');
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * .7, box.y + box.height * .55);
    await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-ry'))) > .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .7 + 90, box.y + box.height * .55, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x')) > 20);
    assert.equal(await card.evaluate(e => e.classList.contains('is-dragging')), false);
    const shifted = await card.boundingBox();
    await page.mouse.move(shifted.x + shifted.width / 2, shifted.y + shifted.height / 2);
    await page.mouse.down();
    await page.mouse.move(shifted.x - 200, shifted.y + shifted.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForFunction(() => parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x')) < -20);
    await page.getByRole('button', { name: 'Centralizar', exact: true }).click();
    await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x'))) < .1);
    await card.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x')) > 15);
    await page.keyboard.press('Home');
    await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x'))) < .1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Mover cartão para a esquerda', exact: true }).click();
    assert.ok(await card.evaluate(e => parseFloat(e.style.getPropertyValue('--card-x'))) < 0);
    assert.equal(await card.evaluate(e => parseFloat(e.style.getPropertyValue('--card-ry'))), 0);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
    assert.equal(await page.locator('.card-sheen').evaluate(e => getComputedStyle(e).display), 'none');
  } finally { await page.close(); }
});

test('scroll animations replay on downward and upward entry and respect motion preference changes', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 850 } });
  try {
    await page.addInitScript(() => {
      window.revealRuns = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (this.classList.contains('benefit-featured')) window.revealRuns.push(frames[0].transform);
        return animate.call(this, frames, options);
      };
    });
    await page.goto(base);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    await page.locator('.benefit-featured').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.revealRuns.length > 0);
    const firstCount = await page.evaluate(() => window.revealRuns.length);
    await page.locator('#parceiros').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.benefit-featured').getBoundingClientRect().bottom < 0);
    // Wait for the observer's exit notification before reversing direction.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('.benefit-featured').scrollIntoViewIfNeeded();
    await page.waitForFunction(count => window.revealRuns.length > count, firstCount);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getAnimations().filter(a => a.playState === 'running').length === 0);
    const stoppedCount = await page.evaluate(() => window.revealRuns.length);
    await page.locator('#parceiros').scrollIntoViewIfNeeded();
    await page.locator('.benefit-featured').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => window.revealRuns.length), stoppedCount);
  } finally { await page.close(); }
});

test('touch dragging does not trap vertical scrolling; pointer cancellation releases card', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await page.goto(base);
    await page.locator('.card-stage').scrollIntoViewIfNeeded();
    const client = await page.context().newCDPSession(page);
    const box = await page.locator('.club-card').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => parseFloat(document.querySelector('.club-card').style.getPropertyValue('--card-x')) > 0);
    const before = await page.evaluate(() => scrollY);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let delta = 20; delta <= 160; delta += 20) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - delta }] });
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(value => scrollY > value + 30, before);
    assert.equal(await page.locator('.club-card').evaluate(e => e.classList.contains('is-dragging')), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally { await page.close(); }
});

test('content and Bootstrap SVG icons remain visible with JavaScript disabled', async () => {
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await page.goto(base);
    assert.equal(await page.locator('h1').isVisible(), true);
    assert.equal(await page.locator('.benefit-featured').isVisible(), true);
    assert.equal(await page.locator('.institute-link').isVisible(), true);
    assert.ok(await page.locator('svg use').count() > 30);
    await page.locator('summary').nth(1).click();
    assert.notEqual(await page.locator('details').nth(1).getAttribute('open'), null);
  } finally { await page.close(); }
});
