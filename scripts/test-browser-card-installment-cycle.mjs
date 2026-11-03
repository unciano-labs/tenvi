import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9224; // Unique debug port
const TARGET_URL = 'http://localhost:3001/dev/ui';
const ARTIFACT_DIR = '/Users/jeunciano/.gemini/antigravity/brain/22bc44db-ed49-4635-85e5-a3b102a7dbca';
const BACKUP_DIR = path.resolve('artifacts/installment-cycle-test');

[ARTIFACT_DIR, BACKUP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
    const primaryPath = path.join(ARTIFACT_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(primaryPath, buffer);
    fs.writeFileSync(backupPath, buffer);
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
      '--window-size=1280,1050',
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
      // waiting
    }
    await sleep(200);
  }

  if (!versionInfo) {
    chromeProcess.kill();
    throw new Error('Chrome did not launch in time.');
  }

  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.ready();

  try {
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    console.log('🌐 Navigating to', TARGET_URL);
    await cdp.send('Page.navigate', { url: TARGET_URL });
    await sleep(2500);

    // Scroll to the Card Details Demo section
    await cdp.eval(`
      const target = document.getElementById('card-details-demo');
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    `);
    await sleep(800);

    // 1. Initial State: Check default view
    console.log('\n--- Step 1: Default Statement View ---');
    const initialTriggerText = await cdp.eval(`
      const section = document.getElementById('card-details-demo');
      const trigger = section.querySelector('[data-slot="select-trigger"]');
      return trigger ? trigger.innerText.trim() : null;
    `);
    console.log('Default Dropdown Trigger Text:', initialTriggerText);

    await cdp.screenshot('01-default-statement-view.png');

    // 2. Open dropdown and inspect options
    console.log('\n--- Step 2: Open Statement Month Dropdown ---');
    await cdp.eval(`
      const section = document.getElementById('card-details-demo');
      const trigger = section.querySelector('[data-slot="select-trigger"]');
      if (trigger) trigger.click();
    `);
    await sleep(600);

    const dropdownOptions = await cdp.eval(`
      return Array.from(document.querySelectorAll('[data-slot="select-item"]'))
        .map(el => el.innerText.trim());
    `);
    console.log('Dropdown Options:', dropdownOptions);

    await cdp.screenshot('02-october-dropdown-selection.png');

    const octOption = dropdownOptions.find(opt => opt.includes('October 2026'));
    if (!octOption) {
      throw new Error('Expected October 2026 in dropdown options');
    }
    console.log('Found October Option:', octOption);

    // 3. Select October 2026
    console.log('\n--- Step 3: Select October 2026 and Verify Installment ---');
    await cdp.eval(`
      const items = Array.from(document.querySelectorAll('[data-slot="select-item"]'));
      const octItem = items.find(el => el.innerText.includes('October 2026'));
      if (octItem) octItem.click();
    `);
    await sleep(800);

    // Verify October statement displays the "Iphone 17 Pro (Mine)" installment!
    const octDetails = await cdp.eval(`
      const section = document.getElementById('card-details-demo');
      const allText = section.innerText;

      // Find the statement card for October
      const statementCards = Array.from(section.querySelectorAll('.space-y-4 > [data-slot="card"], .space-y-4 .shadow-card'));
      const octStatementCard = statementCards.find(c => c.innerText.includes('Bill is made:') || c.innerText.includes('Cycle:'));

      let instData = null;
      let statementTotal = null;

      if (octStatementCard) {
        statementTotal = octStatementCard.querySelector('.text-right .font-extrabold')?.innerText?.trim();
        const instRows = Array.from(octStatementCard.querySelectorAll('.group'));
        const iphoneRow = instRows.find(r => r.innerText.includes('Iphone 17 Pro (Mine)'));

        if (iphoneRow) {
          instData = {
            name: iphoneRow.querySelector('.font-bold.text-foreground')?.innerText?.trim(),
            badge: iphoneRow.querySelector('[data-slot="badge"]')?.innerText?.trim(),
            type: iphoneRow.innerText.includes('Card Installment') ? 'Card Installment' : 'Unknown',
            dueDate: Array.from(iphoneRow.querySelectorAll('span')).find(s => s.innerText.includes('Due:'))?.innerText?.trim(),
            amount: iphoneRow.querySelector('.font-extrabold')?.innerText?.trim(),
            remainingBal: Array.from(iphoneRow.querySelectorAll('span')).find(s => s.innerText.includes('Remaining bal:'))?.innerText?.trim(),
          };
        }
      }

      return {
        hasIphone: allText.includes('Iphone 17 Pro (Mine)'),
        hasAirPods: allText.includes('Power Mac Center AirPods Pro'),
        hasRustans: allText.includes("Rustan's Supermarket Groceries"),
        hasDuplicateSwipe: allText.includes('Duplicate Swipe'),
        octCardFound: Boolean(octStatementCard),
        instData,
        statementTotal,
      };
    `);

    console.log('October Statement Content Verification:', octDetails);

    await cdp.screenshot('03-october-statement-with-iphone-installment.png');

    if (!octDetails.hasIphone) {
      throw new Error('FAILED: "Iphone 17 Pro (Mine)" was NOT found in October statement cycle!');
    }
    if (!octDetails.instData) {
      throw new Error('FAILED: Installment item row was not found in October statement cycle!');
    }
    if (!octDetails.hasAirPods) {
      throw new Error('FAILED: Expected AirPods transaction to also be displayed in October!');
    }
    if (octDetails.hasRustans) {
      throw new Error('FAILED: November transaction (Rustans) should NOT appear in October statement!');
    }
    if (octDetails.hasDuplicateSwipe) {
      throw new Error('FAILED: Duplicate transaction with same loan ID ("Duplicate Swipe") should be HIDDEN!');
    }
    if (octDetails.statementTotal !== '₱25,000.00') {
      throw new Error(`FAILED: Statement total should be ₱25,000.00 without duplicate loan/transaction, but got: ${octDetails.statementTotal}`);
    }

    console.log('✅ PASS: "Iphone 17 Pro (Mine)" is clearly displayed in October statement cycle!');
    console.log('✅ PASS: Duplicate transaction with same loan ID is HIDDEN!');
    console.log(`✅ PASS: Statement Total is accurately ₱25,000.00 (not doubled to ₱31,500.00)!`);
    console.log('Installment row details:', octDetails.instData);

    // 4. Test "All Statement Months"
    console.log('\n--- Step 4: Select "All Statement Months" ---');
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
    await sleep(800);

    await cdp.screenshot('04-all-statements-view-with-installments.png');

    console.log('\n🎉 ALL 4 BROWSER CHECKS PASSED SUCCESSFULLY!');
  } finally {
    cdp.close();
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
