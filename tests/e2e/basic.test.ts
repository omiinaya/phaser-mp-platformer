import puppeteer from 'puppeteer';
import { join } from 'path';

describe('E2E Basic Game Load', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('should load the game page and have a canvas', async () => {
    const filePath = join(__dirname, '../../client/public/index.html');
    await page.goto(`file://${filePath}`);
    await page.waitForSelector('canvas');
    const canvasCount = await page.$$eval('canvas', (els) => els.length);
    expect(canvasCount).toBeGreaterThan(0);
  });

  it('should have Phaser game object', async () => {
    const filePath = join(__dirname, '../../client/public/index.html');
    await page.goto(`file://${filePath}`);
    // Wait for Phaser to be loaded (assuming global Phaser)
    await page.waitForFunction(() => (window as any).Phaser !== undefined, { timeout: 5000 });
    const hasPhaser = await page.evaluate(() => (window as any).Phaser !== undefined);
    expect(hasPhaser).toBe(true);
  });
});