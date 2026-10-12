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


async function testPage(options = {}) {
  const page = await browser.newPage(options);
  // Provider availability is separate from site behavior. Keep map markup/URL
  // checks, but isolate Google Maps in these deterministic local UI tests.
  await page.route('https://maps.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '' }));
  return page;
}

test('responsive page loads local assets and keeps handwritten notes level', async () => {
  const page = await testPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.url());
  });
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
        missingSymbols: [...document.querySelectorAll('use')].filter(e => !document.querySelector(e.getAttribute('href'))).length,
        fonts: [...document.fonts].every(font => font.status === 'loaded'),
        tiltedNotes: [...document.querySelectorAll('.handwritten')].filter(e => getComputedStyle(e).transform !== 'none').length,
        stars: document.querySelectorAll('use[href="#bi-stars"]').length,
        emoji: /[\u{1F300}-\u{1FAFF}★☆✨⭐]/u.test(document.body.innerText)
      }));
      assert.equal(result.overflow, false, 'Overflow at ' + width);
      assert.equal(result.missingSymbols, 0);
      assert.equal(result.fonts, true);
      assert.equal(result.tiltedNotes, 0);
      assert.equal(result.stars, 0);
      assert.equal(result.emoji, false);
      assert.equal(await page.locator('.institute-link').isVisible(), true);
      if (width === 390) {
        await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
        await page.locator('#navigation').getByText('Benefícios', { exact: true }).click();
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
        await page.locator('summary').nth(1).click();
        assert.notEqual(await page.locator('details').nth(1).getAttribute('open'), null);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('card rotates on a fixed central axis, exposes its back and has no movement buttons', async () => {
  const page = await testPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(base);
    const stage = page.locator('.card-stage');
    const card = page.locator('.club-card');
    await stage.scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.card-control, .card-reset, .card-controls').count(), 0);
    const box = await stage.boundingBox();
    const width = await card.evaluate(e => e.offsetWidth);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + width, y, { steps: 20 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.card-stage').getAttribute('aria-valuetext') === 'Verso do cartão');
    assert.equal(Number(await stage.getAttribute('aria-valuenow')), 180);
    const matrix = await card.evaluate(e => {
      const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
      return { x: m.m41, y: m.m42, z: m.m43, xTilt: m.m23, zTilt: m.m12, back: m.m11 };
    });
    assert.deepEqual(matrix, { x: 0, y: 0, z: 0, xTilt: 0, zTilt: 0, back: -1 });
    assert.equal(await page.locator('.card-face.card-back').evaluate(e => getComputedStyle(e).backfaceVisibility), 'hidden');
    await stage.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('.club-card').style.getPropertyValue('--card-angle') === '0.00deg');
    await page.keyboard.press('Enter');
    assert.equal(await stage.getAttribute('aria-valuetext'), 'Verso do cartão');
    await page.keyboard.press('ArrowLeft');
    assert.equal(Number(await stage.getAttribute('aria-valuenow')), 165);
    await page.keyboard.press('Home');
    await page.mouse.move(x + 50, y + 15);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(Number(await stage.getAttribute('aria-valuenow')), 0, 'Hover must not rotate the card');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('End');
    assert.equal(await stage.getAttribute('aria-valuetext'), 'Verso do cartão');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
  } finally { await page.close(); }
});

test('scrolling does not translate sections or replay animations on reentry', async () => {
  const page = await testPage({ viewport: { width: 1440, height: 850 } });
  try {
    await page.addInitScript(() => {
      window.revealRuns = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (this.classList.contains('benefit-featured')) window.revealRuns.push({ frames, options });
        return animate.call(this, frames, options);
      };
    });
    await page.goto(base);
    await page.locator('.benefit-featured').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.revealRuns.length === 1);
    const run = await page.evaluate(() => window.revealRuns[0]);
    assert.ok(run.options.duration <= 200);
    assert.ok(run.frames.every(frame => !('transform' in frame)));
    for (let i = 0; i < 2; i++) {
      await page.locator('#parceiros').scrollIntoViewIfNeeded();
      await page.locator('.benefit-featured').scrollIntoViewIfNeeded();
    }
    assert.equal(await page.evaluate(() => window.revealRuns.length), 1);
    assert.equal(await page.locator('.header').evaluate(e => getComputedStyle(e).backdropFilter), 'none');
    assert.equal(await page.locator('html').evaluate(e => getComputedStyle(e).scrollBehavior), 'auto');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getAnimations().filter(a => a.playState === 'running').length === 0);
  } finally { await page.close(); }
});

test('touch can rotate the card without trapping vertical scroll', async () => {
  const page = await testPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await page.goto(base);
    await page.locator('.card-stage').scrollIntoViewIfNeeded();
    const client = await page.context().newCDPSession(page);
    const box = await page.locator('.card-stage').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => Number(document.querySelector('.card-stage').getAttribute('aria-valuenow')) > 0);
    const before = await page.evaluate(() => scrollY);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let delta = 20; delta <= 160; delta += 20) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - delta }] });
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(value => scrollY > value + 30, before);
    assert.equal(await page.locator('.card-stage').evaluate(e => e.classList.contains('is-dragging')), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally { await page.close(); }
});

test('official footer preserves contact, social and donation destinations and its own typography', async () => {
  const page = await testPage();
  try {
    await page.goto(base);
    const actual = await page.locator('.footer-contact a, .footer-social a, .footer-donate').evaluateAll(links => links.map(a => a.href));
    assert.deepEqual(actual, [
  "mailto:contato.ventureverse@gmail.com",
  "https://api.whatsapp.com/send/?phone=5517982254444&text&type=phone_number&app_absent=0",
  "https://api.whatsapp.com/send/?phone=5517982254444&text&type=phone_number&app_absent=0",
  "https://www.instagram.com/escolajovensdenegocios?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  "https://www.linkedin.com/in/escola-jovens-de-neg%C3%B3cios-280984277/",
  "https://www.tiktok.com/@escolajovensdenegocios",
  "https://www.youtube.com/@podjovens.oficial",
  "https://br.pinterest.com/escolajovensdenegocios/",
  "https://escolajovensdenegocios.com/doe/"
]);
    assert.equal(await page.locator('.footer-social a').count(), 6);
    assert.equal(await page.locator('.footer-social a[aria-label="TikTok"]').count(), 1);
    const map = page.locator('.footer-map iframe');
    assert.equal(await map.getAttribute('loading'), 'lazy');
    assert.equal(await map.getAttribute('src'), 'https://maps.google.com/maps?q=Escola%20Jovens%20de%20Neg%C3%B3cios&t=m&z=15&output=embed&iwloc=near');
    assert.match(await page.locator('.institute-footer').evaluate(e => getComputedStyle(e).fontFamily), /Poppins/);
    assert.equal(await page.locator('.footer-donate').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 165, 0)');
    assert.equal(await page.locator('.footer-social a').first().evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(1, 62, 53)');
  } finally { await page.close(); }
});

test('content and inline icons work without JavaScript', async () => {
  const page = await testPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await page.goto(base);
    assert.equal(await page.locator('h1').isVisible(), true);
    assert.equal(await page.locator('.benefit-featured').isVisible(), true);
    assert.equal(await page.locator('.institute-link').isVisible(), true);
    assert.equal(await page.locator('.footer-social a').count(), 6);
    await page.locator('summary').nth(1).click();
    assert.notEqual(await page.locator('details').nth(1).getAttribute('open'), null);
  } finally { await page.close(); }
});
