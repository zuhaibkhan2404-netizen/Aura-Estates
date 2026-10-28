import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const out = '/tmp/claude-0/shots';
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const errors = [];
async function run(name, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
  if (opts.noWebgl) await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function () { return null; }; });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/${name}-1-hero.png` });
  await page.evaluate(() => document.getElementById('collection').scrollIntoView());
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${name}-2-collection.png` });
  await opts.after?.(page, name);
  await ctx.close();
}
const mode = process.argv[3] || 'all';
if (mode === 'all' || mode === 'desktop') await run('desktop', { width: 1440, height: 900 }, {
  after: async (page, name) => {
    await page.click('button[aria-label="Next residence"]'); await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${name}-3-next.png` });
    await page.getByRole('button', { name: 'Explore Residence', exact: true }).click(); await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${name}-4-detail.png` });
    const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent);
    console.log('focus after explore:', focused);
    await page.click('.showroom__panel .back-btn'); await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${name}-5-back.png` });
    console.log('selected after back:', await page.textContent('.showroom__name'));
    // keyboard
    await page.focus('.showroom__stage'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1300);
    console.log('after ArrowLeft:', await page.textContent('.showroom__name'));
    // drag
    const box = await page.locator('.showroom__stage').boundingBox();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * 0.6 - i * 50, box.y + box.height / 2);
    await page.mouse.up(); await page.waitForTimeout(1400);
    console.log('after drag left:', await page.textContent('.showroom__name'));
    await page.screenshot({ path: `${out}/${name}-6-drag.png` });
    for (const id of ['residence', 'story', 'lifestyle', 'location', 'enquire']) {
      await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id); await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${name}-7-${id}.png` });
    }
    await page.evaluate(() => { const s = document.getElementById('story'); window.scrollTo(0, s.offsetTop + s.offsetHeight * 0.45); }); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}-8-story-mid.png` });
    // form: submit empty
    await page.evaluate(() => document.getElementById('enquire').scrollIntoView());
    await page.click('button[type=submit]'); await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}-9-form-errors.png` });
    console.log('errors shown:', await page.locator('.field__error').count(), 'summary focused:', await page.evaluate(() => document.activeElement?.className));
    await page.fill('input[name=name]', 'Amina Rahman'); await page.fill('input[name=email]', 'amina@example'); 
    await page.selectOption('select[name=residence]', 'villa-solenne');
    const d = new Date(); d.setDate(d.getDate() + 10); await page.fill('input[name=date]', d.toISOString().slice(0, 10));
    await page.check('input[name=consent]'); await page.click('button[type=submit]'); await page.waitForTimeout(300);
    console.log('after bad email, errors:', await page.locator('.field__error').allTextContents());
    await page.fill('input[name=email]', 'amina@example.com'); await page.click('button[type=submit]'); await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}-10-form-demo.png` });
    console.log('result:', (await page.textContent('.form-result'))?.slice(0, 80));
  },
});
if (mode === 'all' || mode === 'mobile') await run('mobile', { width: 390, height: 844 }, { touch: true, after: async (page, name) => {
  await page.getByRole('button', { name: 'Explore Residence', exact: true }).click(); await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}/${name}-4-detail.png`, fullPage: false });
  await page.evaluate(() => document.querySelector('.showroom__panel').scrollIntoView({block:'center'})); await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-4b-panel.png` });
  for (const id of ['residence', 'story', 'location', 'enquire']) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id); await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${name}-7-${id}.png` });
  }
  await page.click('.menu-toggle'); await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}-menu.png` });
} });
if (mode === 'all' || mode === 'fallback') await run('nowebgl', { width: 1280, height: 800 }, { noWebgl: true });
if (mode === 'all' || mode === 'reduced') await run('reduced', { width: 1280, height: 800 }, { reduced: true, after: async (page, name) => {
  await page.getByRole('button', { name: 'Explore Residence', exact: true }).click(); await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-4-detail.png` });
  await page.evaluate(() => document.getElementById('story').scrollIntoView()); await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-7-story.png` });
}});
console.log('CONSOLE ERRORS/WARNINGS:\n' + (errors.join('\n') || 'none'));
await browser.close();
