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
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      // A fake camera (test pattern) that needs no permission prompt.
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera'],
    });
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
    check('defaults are Quads 155', await page.getByText('155 BPM').first().isVisible());
    check(
      'the Quads 155 preset is selected',
      (await page.getByRole('radio', { name: 'Quads 155' }).getAttribute('aria-checked')) ===
        'true',
    );
    const preview = page.getByTestId('camera-preview-front');
    await preview.waitFor({ timeout: 10_000 }).catch(() => {});
    check('the front camera shows by default', await preview.isVisible());
    await page.getByTestId('camera-flip').click();
    check(
      'the flip button switches to the back camera',
      await page.getByTestId('camera-preview-back').isVisible(),
    );
    await page.getByTestId('camera-flip').click();
    const dots = page.getByTestId('page-dots');
    const link = page.getByTestId('go-to-settings');
    check(
      'first open: page dots and a swipe hint',
      (await dots.getAttribute('aria-label')) === 'Page 1 of 2: Practice' &&
        (await link.textContent()) === 'Swipe left for settings & stats ›',
    );
    // The rest of the test runs at Standard 16 (120 BPM, calls 1–7) on the settings page.
    await link.click();
    await page.getByRole('radio', { name: 'Standard 16' }).click();
    check(
      'the dots follow the page and the hint goes away',
      (await dots.getAttribute('aria-label')) === 'Page 2 of 2: Settings & stats' &&
        (await link.textContent()) === 'Settings & stats ›',
    );
    await dots.click();
    await page.waitForTimeout(800); // the pager scrolls (animated)
    const startBox = await startButton.boundingBox();
    check(
      'tapping the page dots goes back to practice',
      (await dots.getAttribute('aria-label')) === 'Page 1 of 2: Practice' &&
        startBox !== null &&
        startBox.x >= 0 &&
        startBox.x < 390,
      startBox ? `Start at x=${Math.round(startBox.x)}` : 'Start not found',
    );
    check('Standard 16 sets 120 BPM', await page.getByText(`${BPM} BPM`).first().isVisible());
    const stripRows = await page.locator('[data-testid="phrase-strip-row"]').count();
    check('16-count phrase strip fits on one row', stripRows === 1, `${stripRows} row(s)`);
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
    const historyRow = page.getByLabel(/^Today .*: 1 toss, 1 dropped, 0% caught/);
    check('the session is in History after a reload', await historyRow.isVisible());
    check(
      'the History row names the preset and the tempo it was practiced at (not the new tempo)',
      (await historyRow.getAttribute('aria-label'))?.includes(`Standard 16, ${BPM} BPM`) &&
        (await page.getByText(`Standard 16 · ${BPM} BPM`).first().isVisible()),
      await historyRow.getAttribute('aria-label'),
    );
    // Share: no share sheet in headless Chromium, so the CSV downloads.
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.getByTestId('history-share').click(),
    ]);
    const csv = fs.readFileSync(await download.path(), 'utf8').split('\r\n');
    check(
      'Share history downloads a CSV with the session',
      /^guardrr-history-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()) &&
        csv[0].startsWith('Date,Time,Preset,BPM') &&
        new RegExp(`^\\d{4}-\\d{2}-\\d{2},\\d{2}:\\d{2},Standard 16,${BPM},16,`).test(csv[1]),
      `${download.suggestedFilename()}: ${csv[1]}`,
    );
    check(
      'History says where the CSV went',
      (await page.getByTestId('history-share-note').textContent())?.startsWith(
        'Saved guardrr-history-',
      ),
    );
    check(
      'the swipe hint stays gone after a reload',
      (await link.textContent()) === 'Settings & stats ›',
    );

    // 5b. Hand-pick calls 3, 5 and 7: only those are called, and the set is saved.
    for (const call of [1, 2, 4, 6]) await page.getByTestId(`call-chip-${call}`).click();
    check('hand-picked calls show as 3, 5, 7', await page.getByText('Calls: 3, 5, 7').isVisible());
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    check('hand-picked calls survive a reload', await page.getByText('Calls: 3, 5, 7').isVisible());
    await page.getByRole('button', { name: 'Start practice' }).click();
    // Stop after the call but before the release, so no session is recorded.
    await page.waitForTimeout((COUNT_IN - LEAD_COUNTS + 1.5) * (60_000 / (BPM + 1)));
    await page.getByRole('button', { name: 'Stop practice' }).click();
    const picked = await page.evaluate(() => window.__speech.map((u) => u.text));
    check(
      'only a hand-picked call is spoken',
      picked.length === 1 && ['three', 'five', 'seven'].includes(picked[0]),
      picked.map((t) => `"${t}"`).join(', ') || 'none',
    );
    await page.screenshot({ path: path.join(outDir, 'calls.png'), fullPage: true });

    // 5c. Call shortcuts: Odd and All pick whole groups in one tap.
    await page.getByTestId('call-shortcut-odd').click();
    check(
      'Odd picks the odd counts',
      await page.getByText('Calls: 1, 3, 5, 7, 9, 11, 13, 15').isVisible(),
    );
    check(
      'the note under the chips names the Odd shortcut',
      await page.getByText(/^Odd counts only\./).isVisible(),
    );
    await page.getByTestId('call-shortcut-all').click();
    check('All picks every call', await page.getByText('Calls: 1–16').isVisible());

    // 5d. History filters: with an older hand-tuned session added, chips narrow
    // the totals and rows to one preset.
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('guardrr.history'));
      stored.sessions.push({
        startedAt: Date.now() - 3 * 86_400_000,
        durationMs: 90_000,
        bpm: 100,
        phraseLength: 8,
        tosses: 3,
        drops: 0,
        timesCalled: { 2: 3 },
        timesDropped: {},
      });
      localStorage.setItem('guardrr.history', JSON.stringify(stored));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    const filterChip = (key) => page.getByTestId(`history-filter-${key}`);
    check(
      'History offers All / Standard 16 / No preset filters',
      (await filterChip('all').getAttribute('aria-checked')) === 'true' &&
        (await filterChip('preset:Standard 16').isVisible()) &&
        (await filterChip('none').isVisible()) &&
        (await page.getByText(/^2 sessions · 4 tosses/).isVisible()),
    );
    await filterChip('none').click();
    check(
      'the No preset filter shows only the hand-tuned session',
      (await page.getByText(/^1 session · 3 tosses/).isVisible()) &&
        (await page.getByText('100 BPM · 8 counts').isVisible()) &&
        !(await historyRow.isVisible()),
    );
    await filterChip('preset:Standard 16').click();
    check(
      'the Standard 16 filter shows only its session',
      (await page.getByText(/^1 session · 1 toss · 0% caught/).isVisible()) &&
        (await historyRow.isVisible()) &&
        !(await page.getByText('100 BPM · 8 counts').isVisible()),
    );
    const [filtered] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.getByTestId('history-share').click(),
    ]);
    const filteredCsv = fs
      .readFileSync(await filtered.path(), 'utf8')
      .trim()
      .split('\r\n');
    check(
      'Share with a filter sends only the filtered sessions',
      filteredCsv.length === 2 && filteredCsv[1].includes(',Standard 16,'),
      `${filteredCsv.length - 1} row(s)`,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    check(
      'the chosen History filter survives a reload',
      (await filterChip('preset:Standard 16').getAttribute('aria-checked')) === 'true' &&
        (await page.getByText(/^1 session · 1 toss · 0% caught/).isVisible()),
    );
    await filterChip('all').click();

    // 5d2. Catch-rate trend: the dropped call practiced again, cleanly, reads "getting better".
    const historyBefore = await page.evaluate(() => {
      const json = localStorage.getItem('guardrr.history');
      const stored = JSON.parse(json);
      const dropped = stored.sessions.find((r) => r.drops > 0);
      const droppedCall = Object.keys(dropped.timesDropped)[0];
      stored.sessions.unshift({
        startedAt: Date.now(),
        durationMs: 60_000,
        bpm: 120,
        phraseLength: 16,
        tosses: 4,
        drops: 0,
        timesCalled: { [droppedCall]: 4 },
        timesDropped: {},
      });
      localStorage.setItem('guardrr.history', JSON.stringify(stored));
      return json;
    });
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    const trendRow = page.getByLabel(/: caught 0%, then 100%, over 2 sessions: getting better$/);
    check(
      'History shows the catch-rate trend of a dropped call',
      (await trendRow.count()) === 1 && (await page.getByText('0% → 100%').isVisible()),
      await page
        .getByTestId('history-trends')
        .textContent()
        .catch(() => 'no trends'),
    );
    await page.evaluate((json) => localStorage.setItem('guardrr.history', json), historyBefore);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();

    // 5e. History: delete a session, undo it, then clear all (asks first) and reload.
    await page.getByTestId('history-edit').click();
    await page.getByRole('button', { name: /^Delete session Today/ }).click();
    check(
      'deleting a session offers Undo',
      (await page.getByText(/^Deleted Today/).isVisible()) && !(await historyRow.isVisible()),
    );
    await page.getByTestId('history-undo').click();
    check('Undo puts the session back', await historyRow.isVisible());
    await page.getByTestId('history-clear').click();
    await page.getByTestId('history-clear-confirm').click();
    check('Clear all empties History', await page.getByText('No sessions saved.').isVisible());
    await page.getByTestId('history-edit').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    check(
      'cleared History stays cleared after a reload',
      (await page.getByText('History', { exact: true }).count()) === 0,
    );

    // 5f. Presets of your own: save, name clash, survive a reload, reorder, delete with Undo.
    const mine = page.getByRole('radio', { name: 'Full range, your preset' });
    await page.getByTestId('preset-save').click();
    await page.getByTestId('preset-name').fill('Full range');
    await page.getByTestId('preset-save-confirm').click();
    check(
      'saving a preset adds it, selected',
      (await mine.isVisible()) && (await mine.getAttribute('aria-checked')) === 'true',
    );
    await page.getByRole('radio', { name: 'Standard 16' }).click();
    await page.getByTestId('call-shortcut-odd').click();
    await page.getByTestId('preset-save').click();
    await page.getByTestId('preset-name').fill('standard 16');
    await page.getByTestId('preset-save-confirm').click();
    check(
      'a preset name already in use is refused',
      await page.getByText('A preset already has that name.').isVisible(),
    );
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    await mine.click();
    check(
      'a saved preset survives a reload and applies its calls',
      await page.getByText('Calls: 1–16').isVisible(),
    );
    // Rename it, then write a new tempo and new calls back to it.
    const renamed = page.getByRole('radio', { name: 'Everything, your preset' });
    await page.getByTestId('preset-rename').click();
    await page.getByTestId('preset-name').fill('Everything');
    await page.getByTestId('preset-save-confirm').click();
    check(
      'renaming a preset keeps it selected',
      (await renamed.getAttribute('aria-checked')) === 'true' && (await mine.count()) === 0,
    );
    await page.getByRole('button', { name: 'BPM plus 1' }).click();
    const update = page.getByTestId('preset-update');
    const tempoOffer = (await update.textContent()) ?? '';
    await update.click();
    check(
      'a new tempo can be saved to the preset',
      /^Save \d+ BPM to “Everything”$/.test(tempoOffer) && (await update.count()) === 0,
      tempoOffer,
    );
    await page.getByTestId('call-shortcut-odd').click();
    const settingsOffer = (await update.textContent()) ?? '';
    await update.click();
    check(
      'changed calls can be written back to the preset',
      settingsOffer === 'Update “Everything”' &&
        (await renamed.getAttribute('aria-checked')) === 'true',
      settingsOffer,
    );
    await page.waitForTimeout(500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    await page.getByRole('radio', { name: 'Standard 16' }).click();
    await renamed.click();
    check(
      'the rename and the update survive a reload',
      await page.getByText(/^Odd calls 1–15 · 16 counts/).isVisible(),
    );
    await page.getByTestId('preset-rename').click();
    await page.getByTestId('preset-name').fill('Full range');
    await page.getByTestId('preset-save-confirm').click();
    await page.getByTestId('preset-delete').click();
    check(
      'deleting a preset offers Undo',
      (await page.getByText('Deleted “Full range”').isVisible()) && (await mine.count()) === 0,
    );
    await page.getByTestId('preset-undo').click();
    check('Undo puts the preset back', await mine.isVisible());
    // Move it after a second preset of your own; the order survives a reload.
    await page.getByRole('radio', { name: 'Standard 16' }).click();
    await page.getByTestId('call-shortcut-even').click();
    await page.getByTestId('preset-save').click();
    await page.getByTestId('preset-name').fill('Evens');
    await page.getByTestId('preset-save-confirm').click();
    await mine.click();
    check(
      'the first of your presets can only move later',
      (await page.getByTestId('preset-move-later').isVisible()) &&
        (await page.getByTestId('preset-move-earlier').count()) === 0,
    );
    await page.getByTestId('preset-move-later').click();
    const yours = page.getByRole('radio', { name: /, your preset$/ });
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    const order = await yours.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    check(
      'moving a preset later reorders the chips, after a reload too',
      order.join(' | ') === 'Evens, your preset | Full range, your preset' &&
        (await page.getByTestId('preset-move-earlier').isVisible()),
      order.join(' | '),
    );
    await page.getByTestId('preset-delete').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.getByRole('button', { name: 'Start practice' }).waitFor();
    check('a deleted preset stays deleted after a reload', (await mine.count()) === 0);

    // 5g. Change the phrase length while practicing: the toss in the air finishes its
    // 16-count phrase, then 8-count phrases follow without pressing Stop.
    const live = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera'],
    });
    await live.addInitScript(instrument);
    const livePage = await live.newPage();
    livePage.on('pageerror', (e) => errors.push(`pageerror (live): ${e.message}`));
    await livePage.goto(base);
    await livePage.getByTestId('go-to-settings').click();
    await livePage.getByRole('radio', { name: 'Standard 16' }).click();
    await livePage.getByTestId('go-to-practice').click();
    await livePage.getByRole('button', { name: 'Start practice' }).click();
    await livePage.waitForTimeout(5.5 * MS_PER_COUNT); // count-in click 6
    await livePage.getByTestId('go-to-settings').click();
    await livePage
      .getByRole('radiogroup', { name: 'Counts per phrase' })
      .getByRole('radio', { name: '8 counts', exact: true })
      .click();
    // The note updates on the render after the tap: wait for it (up to a count)
    // rather than reading it straight away, which raced the re-render.
    const noteEl = livePage.getByTestId('live-settings-note');
    await livePage
      .waitForFunction(
        () =>
          /toss \d/.test(
            document.querySelector('[data-testid="live-settings-note"]')?.textContent ?? '',
          ),
        null,
        { timeout: MS_PER_COUNT },
      )
      .catch(() => {});
    const liveNote = await noteEl.textContent();
    check(
      'changing the phrase while practicing says which toss it starts with',
      liveNote === 'Your changes start with toss 2.',
      `"${liveNote}"`,
    );
    await livePage.screenshot({ path: path.join(outDir, 'live-change.png'), fullPage: true });
    // Releases: click 9 (toss 1, 16 counts), then 25 (toss 2) and 33 (toss 3, 8 counts).
    const waitStart = Date.now();
    // Right after toss 2 is released (and before it can be caught), Drop marks toss 1.
    const dropTargetText = await livePage
      .waitForFunction(
        () => document.querySelector('[data-testid="drop-target"]')?.textContent || null,
        null,
        { timeout: 22 * MS_PER_COUNT, polling: 'raf' },
      )
      .then((h) => h.jsonValue())
      .catch(() => null);
    check(
      'right after a release, Drop marks the toss before it',
      /^toss 1 · /.test(dropTargetText ?? ''),
      `"${dropTargetText}"`,
    );
    await livePage.waitForTimeout(Math.max(0, 29 * MS_PER_COUNT - (Date.now() - waitStart)));
    const liveClicks = (await livePage.evaluate(() => window.__plays)).filter(
      (p) => p.kind !== 'and',
    );
    const accents = liveClicks.flatMap((p, i) => (p.kind === 'accent' ? [i + 1] : []));
    check(
      'new phrase length starts at the next free toss (releases on clicks 9, 25, 33)',
      accents.join(',') === '9,25,33',
      `accents on clicks ${accents.join(', ')}`,
    );
    check(
      'the metronome kept going through the change',
      liveClicks.length >= 34,
      `${liveClicks.length} clicks`,
    );
    await livePage.getByTestId('go-to-practice').click();
    await livePage.getByRole('button', { name: 'Stop practice' }).click();
    await live.close();

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
