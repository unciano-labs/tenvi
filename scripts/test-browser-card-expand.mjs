import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223;
const TARGET_URL = 'http://localhost:3000/dev/ui';
const ARTIFACT_DIR = '/Users/jeunciano/.gemini/antigravity/brain/22bc44db-ed49-4635-85e5-a3b102a7dbca';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const wrapped = expression.trim().startsWith('(() =>') ? expression : `(() => {\n${expression}\n})()`;
    const res = await this.send('Runtime.evaluate', {
      expression: wrapped,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.error('Eval Exception:', res.exceptionDetails);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`📸 Screenshot saved: ${filename} (${buffer.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('🚀 Launching Headless Chrome on port', DEBUG_PORT);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      '--window-size=1280,1000',
    ],
    { stdio: 'ignore' }
  );

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        versionInfo = await res.json();
        break;
      }
    } catch {
      // wait
    }
    await sleep(200);
  }

  if (!versionInfo) {
    chromeProcess.kill();
    throw new Error('Chrome did not start in time.');
  }

  console.log('✅ Chrome is ready. Creating target page for', TARGET_URL);
  const newPageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, {
    method: 'PUT',
  });
  const pageInfo = await newPageRes.json();
  const cdp = new CDPClient(pageInfo.webSocketDebuggerUrl);
  await cdp.ready();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  console.log('⏳ Waiting for page to load and hydrate...');
  await sleep(2500);

  // 1. Scroll to the demo expandable card
  console.log('--- 1. Testing Expandable Card Primitive (350ms Ease-Out) ---');
  await cdp.eval(`
    const el = document.getElementById('expandable-card-demo');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  `);
  await sleep(300);

  // Measure initial collapsed state
  const initialMetrics = await cdp.eval(`
    const content = document.getElementById('demo-card-expandable-content');
    const toggle = document.getElementById('demo-card-expand-toggle');
    const chevron = toggle ? toggle.querySelector('svg') : null;
    const style = content ? window.getComputedStyle(content) : null;
    const chevronStyle = chevron ? window.getComputedStyle(chevron) : null;
    return {
      rectHeight: content ? content.getBoundingClientRect().height : -1,
      opacity: style ? style.opacity : '-1',
      gridRows: style ? style.gridTemplateRows : 'unknown',
      transitionDuration: style ? style.transitionDuration : 'unknown',
      transitionTiming: style ? style.transitionTimingFunction : 'unknown',
      chevronRotate: chevronStyle ? chevronStyle.rotate : 'none',
      chevronTransform: chevronStyle ? chevronStyle.transform : 'none',
      isExpanded: content ? content.getAttribute('data-expanded') : 'false'
    };
  `);
  console.log('Initial Collapsed State:', initialMetrics);
  await cdp.screenshot('card-expand-01-collapsed.png');

  // Click expand toggle
  console.log('⚡ Triggering Card Expansion...');
  await cdp.eval(`
    const toggle = document.getElementById('demo-card-expand-toggle');
    if (toggle) toggle.click();
  `);

  // Measure at T = 120ms (~35% elapsed, ~70-85% expanded due to fast-first ease-out curve)
  await sleep(120);
  const midMetrics = await cdp.eval(`
    const content = document.getElementById('demo-card-expandable-content');
    const toggle = document.getElementById('demo-card-expand-toggle');
    const chevron = toggle ? toggle.querySelector('svg') : null;
    const style = content ? window.getComputedStyle(content) : null;
    const chevronStyle = chevron ? window.getComputedStyle(chevron) : null;
    return {
      timeMs: 120,
      rectHeight: content ? content.getBoundingClientRect().height : -1,
      opacity: style ? style.opacity : '-1',
      gridRows: style ? style.gridTemplateRows : 'unknown',
      chevronRotate: chevronStyle ? chevronStyle.rotate : 'none',
      chevronTransform: chevronStyle ? chevronStyle.transform : 'none',
      isExpanded: content ? content.getAttribute('data-expanded') : 'false'
    };
  `);
  console.log('Mid-Expansion (T=120ms) State:', midMetrics);
  await cdp.screenshot('card-expand-02-expanding-120ms.png');

  // Measure at T = 350ms (full expansion settled)
  await sleep(250); // total 370ms elapsed
  const settledMetrics = await cdp.eval(`
    const content = document.getElementById('demo-card-expandable-content');
    const toggle = document.getElementById('demo-card-expand-toggle');
    const chevron = toggle ? toggle.querySelector('svg') : null;
    const style = content ? window.getComputedStyle(content) : null;
    const chevronStyle = chevron ? window.getComputedStyle(chevron) : null;
    return {
      timeMs: 370,
      rectHeight: content ? content.getBoundingClientRect().height : -1,
      opacity: style ? style.opacity : '-1',
      gridRows: style ? style.gridTemplateRows : 'unknown',
      chevronRotate: chevronStyle ? chevronStyle.rotate : 'none',
      chevronTransform: chevronStyle ? chevronStyle.transform : 'none',
      isExpanded: content ? content.getAttribute('data-expanded') : 'false'
    };
  `);
  console.log('Settled Full Expansion (T=370ms) State:', settledMetrics);
  await cdp.screenshot('card-expand-03-settled-350ms.png');

  // 2. Test Statement Cycle Card in CardDetailsClient
  console.log('--- 2. Testing Statement Cycle Card in CardDetailsClient ---');
  await cdp.eval(`
    const section = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Card Details Statement Month Dropdown'));
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
  `);
  await sleep(400);

  // Find the statement cycle collapse button
  const cycleToggleFound = await cdp.eval(`
    const buttons = Array.from(document.querySelectorAll('button[aria-label="Collapse statement"], button[aria-label="Expand statement"]'));
    return buttons.length;
  `);
  console.log(`Found ${cycleToggleFound} statement cycle collapse buttons`);

  if (cycleToggleFound > 0) {
    // Current state is expanded (default is uncollapsed)
    console.log('Capturing Statement Cycle open state...');
    await cdp.screenshot('card-expand-04-statement-cycle-open.png');

    console.log('Collapsing Statement Cycle card...');
    await cdp.eval(`
      const btn = document.querySelector('button[aria-label="Collapse statement"]');
      if (btn) btn.click();
    `);

    await sleep(120);
    console.log('Capturing Statement Cycle mid-collapse (120ms)...');
    await cdp.screenshot('card-expand-05-statement-cycle-collapsing-120ms.png');

    await sleep(250);
    console.log('Capturing Statement Cycle fully collapsed (350ms)...');
    await cdp.screenshot('card-expand-06-statement-cycle-collapsed.png');

    console.log('Re-expanding Statement Cycle card...');
    await cdp.eval(`
      const btn = document.querySelector('button[aria-label="Expand statement"]');
      if (btn) btn.click();
    `);

    await sleep(120);
    console.log('Capturing Statement Cycle mid-expansion (120ms)...');
    await cdp.screenshot('card-expand-07-statement-cycle-reexpanding-120ms.png');

    await sleep(250);
    console.log('Capturing Statement Cycle settled re-expanded (350ms)...');
    await cdp.screenshot('card-expand-08-statement-cycle-settled.png');
  }

  cdp.close();
  chromeProcess.kill();
  console.log('🎉 Browser test completed successfully!');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
