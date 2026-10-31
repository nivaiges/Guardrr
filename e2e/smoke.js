/**
 * Morning smoke test: runs the real app (web build) in headless Chromium and
 * practices for a few seconds, checking what the unit tests can't — that the
 * whole thing boots, the metronome keeps time in a real JS runtime, the call
 * is spoken at the right moment, and the buttons and saved settings work.
 *
 * Usage: node e2e/smoke.js <web export dir> [<output dir>]
 * Writes screenshots and smoke-report.json to the output dir; exits 1 on any
 * failed check. Audio and speech are recorded, not played (headless).
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const BPM = 120;
const MS_PER_COUNT = 60_000 / BPM;
const COUNT_IN = 8; // default count-in
const LEAD_COUNTS = 4; // default: call on the 5th click of the count-in
const NUMBER_WORDS =
  /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen)( and)?$/;

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

/** Records clicks (HTMLMediaElement.play) and spoken calls instead of playing them. */
function instrument() {
  window.__plays = [];
  window.__speech = [];
  HTMLMediaElement.prototype.play = function play() {
    const src = this.currentSrc || this.src || '';
    const kind = /accent/.test(src) ? 'accent' : /click-and/.test(src) ? 'and' : 'count';
    window.__plays.push({ t: performance.now(), kind });
    return Promise.resolve();
  };
  const synth = window.speechSynthesis;
  if (synth) {
    synth.speak = (u) => window.__speech.push({ t: performance.now(), text: u.text });
    synth.cancel = () => {};
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

async function main() {
  const webDir = path.resolve(process.argv[2] || 'dist');
  const outDir = path.resolve(process.argv[3] || 'test-results/morning');
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: Boolean(ok), detail });
    console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const server = await serve(webDir);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(instrument);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });

    // 1. Boots.
    await page.goto(base);
    const startButton = page.getByRole('button', { name: 'Start practice' });
    await startButton.waitFor({ timeout: 20_000 });
    check('app boots and shows Start', true);
    check('subtitle shows the defaults', await page.getByText(`${BPM} BPM`).first().isVisible());
    await page.screenshot({ path: path.join(outDir, 'home.png'), fullPage: true });

    // 2. Practice: count-in, the call, the first release and a few more counts.
    await startButton.click();
    const practiceMs = (COUNT_IN + 6) * MS_PER_COUNT;
    await page.waitForTimeout(practiceMs);
    await page.screenshot({ path: path.join(outDir, 'practicing.png'), fullPage: true });
    const plays = await page.evaluate(() => window.__plays);
    const speech = await page.evaluate(() => window.__speech);
    const counts = plays.filter((p) => p.kind !== 'and');
    check('metronome clicks', counts.length >= COUNT_IN + 4, `${counts.length} clicks`);

    const t0 = counts[0]?.t ?? 0;
    const offsets = counts.map((p, i) => p.t - t0 - i * MS_PER_COUNT);
    const drift = Math.max(...offsets.map(Math.abs));
    const gaps = counts.slice(1).map((p, i) => p.t - counts[i].t);
    check(
      'tempo is 120 BPM',
      Math.abs(median(gaps) - MS_PER_COUNT) < 10,
      `median gap ${median(gaps).toFixed(1)} ms`,
    );
    check(
      'no drift (every click within 40 ms of its slot)',
      drift < 40,
      `worst ${drift.toFixed(1)} ms`,
    );

    check('first click is an unaccented count-in click', counts[0]?.kind === 'count');
    const firstAccent = counts.findIndex((p) => p.kind === 'accent');
    check(
      `first release (accent) on click ${COUNT_IN + 1}`,
      firstAccent === COUNT_IN,
      `accent on click ${firstAccent + 1}`,
    );

    const call = speech[0];
    check(
      'a toss call is spoken',
      call && NUMBER_WORDS.test(call.text),
      call ? `"${call.text}"` : 'none',
    );
    if (call) {
      const callClick = (call.t - t0) / MS_PER_COUNT + 1;
      const expected = COUNT_IN - LEAD_COUNTS + 1;
      check(
        `call spoken on click ${expected}`,
        Math.abs(callClick - expected) < 0.25,
        `on click ${callClick.toFixed(2)}`,
      );
    }

    // 3. Drop and undo.
    const drop = page.getByRole('button', { name: 'Drop', exact: true });
    check('Drop button appears after the first release', await drop.isVisible());
    await drop.click();
    const undo = page.getByRole('button', { name: 'Undo drop' });
    check('Drop turns into Undo drop', await undo.isVisible());
    check(
      'catch rate shows after a drop',
      await page.getByText('caught', { exact: true }).isVisible(),
    );

    // 4. Stop: stats stay.
    await page.getByRole('button', { name: 'Stop practice' }).click();
    check('Stop shows the last session', await page.getByText('Last session').isVisible());
    const playsAtStop = (await page.evaluate(() => window.__plays)).length;
    await page.waitForTimeout(3 * MS_PER_COUNT);
    const playsAfter = (await page.evaluate(() => window.__plays)).length;
    check('metronome is silent after Stop', playsAfter === playsAtStop);
    await page.screenshot({ path: path.join(outDir, 'stopped.png'), fullPage: true });

    // 5. Settings survive a reload.
    await page.getByRole('button', { name: 'BPM plus 1' }).click();
    await page.waitForTimeout(1500); // settings are saved debounced
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    check(
      'BPM change survives a reload',
      await page
        .getByText(`${BPM + 1} BPM`)
        .first()
        .isVisible(),
    );

    // 6. Dark theme renders.
    const dark = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 390, height: 844 },
    });
    await dark.addInitScript(instrument);
    const darkPage = await dark.newPage();
    darkPage.on('pageerror', (e) => errors.push(`pageerror (dark): ${e.message}`));
    await darkPage.goto(base);
    await darkPage.getByRole('button', { name: 'Start practice' }).waitFor();
    const bg = await darkPage.evaluate(() => {
      let el = document.querySelector('[aria-label="Start practice"]');
      while (el) {
        const c = getComputedStyle(el).backgroundColor;
        if (el.getAttribute('aria-label') !== 'Start practice' && c !== 'rgba(0, 0, 0, 0)')
          return c;
        el = el.parentElement;
      }
      return '';
    });
    check('dark theme background', bg === 'rgb(13, 17, 23)', bg);
    await darkPage.screenshot({ path: path.join(outDir, 'dark.png'), fullPage: true });
  } catch (e) {
    check('smoke test ran to the end', false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
    server.close();
  }

  check('no errors in the browser console', errors.length === 0, errors.slice(0, 5).join(' | '));
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(
    path.join(outDir, 'smoke-report.json'),
    JSON.stringify({ passed: failed.length === 0, results }, null, 2),
  );
  console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
