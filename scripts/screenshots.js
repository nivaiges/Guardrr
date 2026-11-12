/**
 * Screenshots of the app for the README and for Niv to see what changed:
 * runs the web build in headless Chromium at phone size (390 x 844 pt, 2x)
 * and captures the main screens — ready (over a fake camera), the call,
 * the release, the catch, stats and history, History in edit mode, shared
 * as CSV and filtered to one preset, the call picker, dark theme, and
 * saving, updating and moving a preset of your own.
 *
 * Usage: node scripts/screenshots.js <web export dir> [<output dir>]
 * (`npm run screenshots` builds for web and writes to docs/screenshots/.)
 * Audio and speech are stubbed out; Math.random is seeded so the calls (and
 * so the pictures) only change when the app does.
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(root, url);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Runs in the page before the app: silent audio/speech, seeded random, sample history. */
function setUp(history) {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.cancel = () => {};
  }
  // Chosen so the first call is a "4 count" (not a pop toss, which has no separate release).
  let seed = 6;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    if (!localStorage.getItem('guardrr.history')) localStorage.setItem('guardrr.history', history);
  } catch {
    // Storage blocked: History just starts empty.
  }
}

/** A few past sessions so the History card has something to show. */
function sampleHistory(now) {
  const hour = 3_600_000;
  const session = (hoursAgo, tosses, dropped, preset, bpm = 120) => {
    const timesCalled = {};
    const timesDropped = {};
    for (let i = 0; i < tosses; i++) {
      const call = String(1 + ((i * 3) % 7));
      timesCalled[call] = (timesCalled[call] ?? 0) + 1;
    }
    for (const [call, n] of Object.entries(dropped)) timesDropped[call] = n;
    return {
      startedAt: now - hoursAgo * hour,
      durationMs: tosses * 8_000,
      bpm,
      phraseLength: 16,
      tosses,
      drops: Object.values(dropped).reduce((a, b) => a + b, 0),
      timesCalled,
      timesDropped,
      // The oldest session predates preset names (shows tempo and phrase instead).
      ...(preset ? { preset } : {}),
    };
  };
  const sessions = [
    session(2, 24, { 7: 2, 5: 1 }, 'Standard 16'),
    session(26, 40, { 7: 3 }, 'Standard 16'),
    session(30, 20, { 5: 2, 6: 1 }, 'Quads 155', 155),
    session(50, 16, {}),
  ];
  return JSON.stringify({ version: 1, sessions });
}

async function main() {
  const webDir = path.resolve(process.argv[2] || 'dist');
  const outDir = path.resolve(process.argv[3] || 'docs/screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serve(webDir);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      // Chromium's fake camera (a green test pattern) stands in for the phone's camera.
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });
  const shots = [];
  const errors = [];

  const open = async (colorScheme) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme,
      permissions: ['camera'],
    });
    await context.addInitScript(setUp, sampleHistory(Date.now()));
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Start practice' }).waitFor({ timeout: 20_000 });
    return { context, page };
  };
  const shot = async (target, name) => {
    await target.screenshot({ path: path.join(outDir, `${name}.png`), animations: 'disabled' });
    shots.push(name);
    console.log(`✓ ${name}.png`);
  };
  const exact = (page, text) => page.getByText(text, { exact: true }).first();
  const scrollTo = (locator) =>
    locator.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));

  try {
    const { context, page } = await open('light');
    await page.getByTestId('camera-preview-front').waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    await shot(page, '01-ready');

    // Practice: the call during the count-in, the release on 1, the catch.
    await page.getByRole('button', { name: 'Start practice' }).click();
    await page
      .getByText(/^Release in /)
      .first()
      .waitFor({ timeout: 10_000 });
    await shot(page, '02-call');
    await exact(page, 'Release!').waitFor({ timeout: 10_000 });
    await shot(page, '03-release');
    await exact(page, 'Catch!').waitFor({ timeout: 15_000 });
    await shot(page, '04-catch');
    // Right after the next release Drop still marks the toss just caught (or dropped).
    await page.getByTestId('drop-target').waitFor({ timeout: 15_000 });
    await shot(page, '17-drop-previous');
    await page.getByRole('button', { name: 'Drop' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Stop practice' }).click();

    // Stats and history after Stop, on the settings page (swipe left / "Settings & stats").
    await page.getByTestId('go-to-settings').click();
    await page.waitForTimeout(600);
    await scrollTo(exact(page, 'Settings & stats'));
    await page.waitForTimeout(200);
    await shot(page, '05-stats-history');
    const historyCard = exact(page, 'History').locator('xpath=../..');
    await page.getByTestId('history-edit').click();
    await page.getByTestId('history-clear').click();
    await shot(historyCard, '06-history-edit');
    await page.getByTestId('history-clear-cancel').click();
    await page.getByTestId('history-edit').click();
    // Share: headless Chromium has no share sheet, so the CSV downloads.
    await Promise.all([page.waitForEvent('download'), page.getByTestId('history-share').click()]);
    await page.getByTestId('history-share-note').waitFor();
    await shot(historyCard, '13-history-share');
    // Filter History to one preset.
    await page.getByTestId('history-filter-preset:Standard 16').click();
    await page.waitForTimeout(200);
    await shot(historyCard, '14-history-filter');
    await page.getByTestId('history-filter-all').click();
    // Filter History to one tempo (the tempo chips show when sessions differ in tempo).
    await page.getByTestId('history-tempo-tempo:120/16').click();
    await page.waitForTimeout(200);
    await shot(historyCard, '18-history-tempo');
    await page.getByTestId('history-tempo-all').click();

    // Settings → Practice: the spoken count-off over the count-in.
    await page.getByRole('switch', { name: /Speak the count-off/ }).click();
    await scrollTo(page.getByText(/^Call \d+ before release/).first());
    await page.waitForTimeout(200);
    await shot(page, '16-count-off');

    // Settings → Calls.
    await page.getByTestId('call-shortcut-odd').click();
    await scrollTo(page.getByText(/^Calls: /).first());
    await page.waitForTimeout(200);
    await shot(page, '07-settings-calls');

    // Presets: save the Odd calls as "Odd drill" — naming it, then the new chip.
    await page.getByTestId('preset-save').click();
    await page.getByTestId('preset-name').fill('Odd drill');
    await scrollTo(exact(page, 'Presets'));
    await page.waitForTimeout(200);
    await shot(page, '09-save-preset');
    await page.getByTestId('preset-save-confirm').click();
    await page.getByTestId('preset-delete').waitFor();
    await page.waitForTimeout(200);
    await shot(page, '10-my-preset');

    // Tweak the preset's calls: Presets offers to update it or save a new one.
    await page.getByTestId('call-shortcut-even').click();
    await page.getByTestId('preset-update').waitFor();
    await scrollTo(exact(page, 'Presets'));
    await page.waitForTimeout(200);
    await shot(page, '11-update-preset');

    // Change the phrase while practicing: the note says which toss it starts with.
    await page.getByTestId('go-to-practice').click();
    await page.getByRole('button', { name: 'Start practice' }).click();
    await page.waitForTimeout(1_500);
    await page.getByTestId('go-to-settings').click();
    await page.waitForTimeout(600);
    await page
      .getByRole('radiogroup', { name: 'Counts per phrase' })
      .getByRole('radio', { name: '8 counts', exact: true })
      .click();
    await page.getByTestId('live-settings-note').waitFor();
    await scrollTo(exact(page, 'Tempo'));
    await page.waitForTimeout(200);
    await shot(page, '12-live-change');
    await page.getByTestId('go-to-practice').click();
    await page.getByRole('button', { name: 'Stop practice' }).click();

    // A second preset of your own: it can move earlier, past "Odd drill".
    await page.getByTestId('go-to-settings').click();
    await page.waitForTimeout(600);
    await page.getByTestId('preset-save').click();
    await page.getByTestId('preset-name').fill('Even 8');
    await page.getByTestId('preset-save-confirm').click();
    await page.getByTestId('preset-move-earlier').waitFor();
    await scrollTo(exact(page, 'Presets'));
    await page.waitForTimeout(200);
    await shot(page, '15-move-preset');
    await context.close();

    // Dark theme, mid-toss.
    const dark = await open('dark');
    await dark.page.getByRole('button', { name: 'Start practice' }).click();
    await exact(dark.page, 'Release!').waitFor({ timeout: 10_000 });
    await shot(dark.page, '08-dark-release');
    await dark.context.close();
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length) {
    console.error(`✗ screenshots failed: ${errors.slice(0, 3).join(' | ')}`);
    process.exit(1);
  }
  console.log(`\n${shots.length} screenshots in ${path.relative(process.cwd(), outDir) || '.'}`);
}

void main();
