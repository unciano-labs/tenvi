import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const TARGET_URL = 'http://localhost:3001/dev/ui';
const SCREENSHOT_DIR = path.resolve('artifacts/browser-test');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

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
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`📸 Screenshot saved: ${filename}`);
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
    } catch (e) {
      // waiting for Chrome
    }
    await sleep(200);
  }

  if (!versionInfo) {
    chromeProcess.kill();
    throw new Error('Chrome did not start in time.');
  }

  console.log('✅ Chrome is ready. Creating target page...');
  const newPageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, {
    method: 'PUT',
  });
  const pageInfo = await newPageRes.json();
  const cdp = new CDPClient(pageInfo.webSocketDebuggerUrl);
  await cdp.ready();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await sleep(2500); // Wait for Turbopack & hydration

  // Scroll down to the card details section
  await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
  `);
  await sleep(1000);

  // 1. Verify default view
  console.log('\n--- Test Step 1: Default View (Current Month Statement) ---');
  const triggerText = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const trigger = section ? section.querySelector('[data-slot="select-trigger"]') : null;
    return trigger ? trigger.innerText.trim() : null;
  `);
  console.log('Dropdown Trigger Text:', triggerText);

  const displayedTxNotes = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    return Array.from(section.querySelectorAll('.font-bold.text-foreground.truncate'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && !t.includes('Visa Platinum'));
  `);
  console.log('Displayed Transaction Notes:', displayedTxNotes);

  const viewingBadgeText = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const el = section.querySelector('.text-xs.text-muted-foreground.font-medium');
    return el ? el.innerText.trim() : '';
  `);
  console.log('Viewing Status/Badge:', viewingBadgeText);

  await cdp.screenshot('01-default-current-month.png');

  // Assertions for Step 1
  if (!triggerText?.includes('November 2026')) {
    throw new Error(`Expected default to be November 2026, got: ${triggerText}`);
  }
  if (!displayedTxNotes.includes("Rustan's Supermarket Groceries")) {
    throw new Error('Expected Rustans Groceries in current month view');
  }
  if (displayedTxNotes.includes('Power Mac Center AirPods Pro')) {
    throw new Error('October AirPods transaction should NOT be in current month view');
  }
  console.log('✅ Step 1 Passed: Default displays current month (November 2026) transactions only!');

  // 2. Click the dropdown trigger to open options
  console.log('\n--- Test Step 2: Open Statement Month Dropdown ---');
  await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const trigger = section.querySelector('[data-slot="select-trigger"]');
    if (trigger) trigger.click();
  `);
  await sleep(600);

  const optionsList = await cdp.eval(`
    return Array.from(document.querySelectorAll('[data-slot="select-item"]'))
      .map(el => el.innerText.trim());
  `);
  console.log('Dropdown Available Options:', optionsList);

  await cdp.screenshot('02-dropdown-open.png');

  if (!optionsList.some(opt => opt.includes('All Statement Months'))) {
    throw new Error('All Statement Months option missing from dropdown');
  }
  if (!optionsList.some(opt => opt.includes('October 2026'))) {
    throw new Error('October 2026 option missing from dropdown');
  }
  console.log('✅ Step 2 Passed: Dropdown opened with all statement cycles listed!');

  // 3. Select October 2026
  console.log('\n--- Test Step 3: Select "October 2026" from Dropdown ---');
  await cdp.eval(`
    const items = Array.from(document.querySelectorAll('[data-slot="select-item"]'));
    const octItem = items.find(el => el.innerText.includes('October 2026'));
    if (octItem) octItem.click();
  `);
  await sleep(600);

  const octTriggerText = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const trigger = section.querySelector('[data-slot="select-trigger"]');
    return trigger ? trigger.innerText.trim() : null;
  `);
  console.log('New Dropdown Trigger Text:', octTriggerText);

  const octTxNotes = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    return Array.from(section.querySelectorAll('.font-bold.text-foreground.truncate'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && !t.includes('Visa Platinum'));
  `);
  console.log('Displayed Transaction Notes in October:', octTxNotes);

  const returnBtnExists = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    return Array.from(section.querySelectorAll('button')).some(b => b.innerText.includes('Return to Current Month'));
  `);
  console.log('Return to Current Month button present:', returnBtnExists);

  await cdp.screenshot('03-october-selected.png');

  if (!octTxNotes.includes('Power Mac Center AirPods Pro')) {
    throw new Error('Expected October AirPods transaction in October view');
  }
  if (octTxNotes.includes("Rustan's Supermarket Groceries")) {
    throw new Error('November Rustans Groceries should NOT be displayed in October view');
  }
  if (!returnBtnExists) {
    throw new Error('Expected "Return to Current Month" button when viewing non-current month');
  }
  console.log('✅ Step 3 Passed: Successfully filtered to October 2026 transactions!');

  // 4. Select "All Statement Months"
  console.log('\n--- Test Step 4: Select "All Statement Months" ---');
  await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const trigger = section.querySelector('[data-slot="select-trigger"]');
    if (trigger) trigger.click();
  `);
  await sleep(400);

  await cdp.eval(`
    const items = Array.from(document.querySelectorAll('[data-slot="select-item"]'));
    const allItem = items.find(el => el.innerText.includes('All Statement Months'));
    if (allItem) allItem.click();
  `);
  await sleep(600);

  const allTxNotes = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    return Array.from(section.querySelectorAll('.font-bold.text-foreground.truncate'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && !t.includes('Visa Platinum'));
  `);
  console.log('All Statement Months Transactions:', allTxNotes);

  await cdp.screenshot('04-all-statements.png');

  if (!allTxNotes.includes("Rustan's Supermarket Groceries") ||
      !allTxNotes.includes('Power Mac Center AirPods Pro') ||
      !allTxNotes.includes('Shell Gas Station Full Tank')) {
    throw new Error('Expected transactions from all months to be visible in All view');
  }
  console.log('✅ Step 4 Passed: All statement periods visible!');

  // 5. Click "Return to Current Month"
  console.log('\n--- Test Step 5: Click "Return to Current Month" ---');
  await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const buttons = Array.from(section.querySelectorAll('button'));
    const returnBtn = buttons.find(b => b.innerText.includes('Return to Current Month'));
    if (returnBtn) returnBtn.click();
  `);
  await sleep(600);

  const resetTriggerText = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    const trigger = section.querySelector('[data-slot="select-trigger"]');
    return trigger ? trigger.innerText.trim() : null;
  `);
  console.log('Reset Dropdown Trigger Text:', resetTriggerText);

  const resetTxNotes = await cdp.eval(`
    const section = document.getElementById('card-details-demo');
    return Array.from(section.querySelectorAll('.font-bold.text-foreground.truncate'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 0 && !t.includes('Visa Platinum'));
  `);
  console.log('Reset Transaction Notes:', resetTxNotes);

  await cdp.screenshot('05-returned-to-current-month.png');

  if (!resetTriggerText?.includes('November 2026')) {
    throw new Error(`Expected reset to November 2026, got: ${resetTriggerText}`);
  }
  if (!resetTxNotes.includes("Rustan's Supermarket Groceries") || resetTxNotes.includes('Power Mac Center AirPods Pro')) {
    throw new Error('Reset failed to isolate current month transactions');
  }
  console.log('✅ Step 5 Passed: Return to Current Month cleanly restored default view!');

  console.log('\n🎉 ALL BROWSER AGENT TESTS PASSED SUCCESSFULLY! 🎉\n');

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Browser Agent Test Failed:', err);
  process.exit(1);
});
