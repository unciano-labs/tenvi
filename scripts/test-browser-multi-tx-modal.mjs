import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223; // Use distinct debug port
const TARGET_URL = 'http://localhost:3001/dev/ui';
const ARTIFACT_DIR = '/Users/jeunciano/.gemini/antigravity/brain/22bc44db-ed49-4635-85e5-a3b102a7dbca';
const BACKUP_DIR = path.resolve('artifacts/multi-tx-test');

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
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buffer);
    fs.writeFileSync(path.join(BACKUP_DIR, filename), buffer);
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
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        versionInfo = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionInfo) {
    console.error('❌ Failed to connect to Chrome remote debugging port.');
    chromeProcess.kill();
    process.exit(1);
  }

  console.log('🔗 Connecting to Chrome target...');
  const targetsRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');

  if (!pageTarget) {
    console.error('❌ No page target found in Chrome.');
    chromeProcess.kill();
    process.exit(1);
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.ready();
  console.log('✅ CDP WebSocket connected.');

  try {
    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(2500);

    // 1. Scroll to the demo section
    console.log('📍 Scrolling to #multi-transaction-modal-demo...');
    await client.eval(`
      const el = document.getElementById('multi-transaction-modal-demo');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      return Boolean(el);
    `);
    await sleep(600);
    await client.screenshot('01-multi-tx-demo-section.png');

    // 2. Click button to open multi-transaction modal
    console.log('🖱️ Clicking button to open Multi-Transaction Cards Modal...');
    const btnClicked = await client.eval(`
      const btn = document.getElementById('btn-open-multi-tx-modal');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    `);
    console.log('Open button clicked:', btnClicked);
    await sleep(800);

    // 3. Verify Modal Opened with 3 Transaction Cards
    const initialModalState = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      if (!dialog) return null;
      const title = dialog.querySelector('[data-slot="responsive-dialog-title"], h2')?.textContent || '';
      const bannerHeader = dialog.querySelector('h4')?.textContent || '';
      const readyBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Ready to Save')).length;
      const needsBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Needs:')).length;
      const cardInputs = dialog.querySelectorAll('input[type="text"]').length;
      return {
        title,
        bannerHeader,
        readyBadges,
        needsBadges,
        cardInputs,
      };
    `);
    console.log('Initial Modal State:', initialModalState);
    await client.screenshot('02-multi-tx-modal-opened.png');

    if (!initialModalState) {
      throw new Error('Responsive dialog content not found in DOM');
    }
    if (!initialModalState.bannerHeader.includes('3 Transactions Detected')) {
      throw new Error(`Expected "3 Transactions Detected", got: "${initialModalState.bannerHeader}"`);
    }
    if (initialModalState.readyBadges !== 2) {
      throw new Error(`Expected 2 Ready to Save badges, got: ${initialModalState.readyBadges}`);
    }
    if (initialModalState.needsBadges !== 1) {
      throw new Error(`Expected 1 Needs Details badge, got: ${initialModalState.needsBadges}`);
    }

    // 4. Fill missing amount on Item 2 (Grab Transport)
    console.log('✏️ Filling in missing amount for Item 2 (Grab Transport) -> ₱250.00...');
    const fillSuccess = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const numberInputs = Array.from(dialog.querySelectorAll('input[type="number"]'));
      // The second number input is Grab Transport's amount
      const grabInput = numberInputs[1];
      if (grabInput) {
        // Use native value setter for React controlled component
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(grabInput, '250.00');
        grabInput.dispatchEvent(new Event('input', { bubbles: true }));
        grabInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    `);
    console.log('Filled amount success:', fillSuccess);
    await sleep(600);

    // 5. Verify reactive update: all 3 items now Ready to Save!
    const stateAfterFill = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const readyBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Ready to Save')).length;
      const needsBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Needs:')).length;
      const approveAllText = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Approve All Ready'))?.textContent || '';
      return {
        readyBadges,
        needsBadges,
        approveAllText,
      };
    `);
    console.log('State After Filling Missing Amount:', stateAfterFill);
    await client.screenshot('03-item2-amount-filled.png');

    if (stateAfterFill.readyBadges !== 3) {
      throw new Error(`Expected 3 Ready to Save badges after filling missing amount, got: ${stateAfterFill.readyBadges}`);
    }
    if (stateAfterFill.needsBadges !== 0) {
      throw new Error(`Expected 0 Needs badges, got: ${stateAfterFill.needsBadges}`);
    }

    // 6. Test Dismiss Item 3 (Caltex Fuel)
    console.log('🗑️ Dismissing Item 3...');
    const dismissSuccess = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const dismissButtons = Array.from(dialog.querySelectorAll('button[title="Dismiss transaction"]'));
      if (dismissButtons.length >= 3) {
        dismissButtons[2].click();
        return true;
      }
      return false;
    `);
    console.log('Dismiss clicked:', dismissSuccess);
    await sleep(600);

    const stateAfterDismiss = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const bannerHeader = dialog.querySelector('h4')?.textContent || '';
      const readyBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Ready to Save')).length;
      return { bannerHeader, readyBadges };
    `);
    console.log('State After Dismissing Item 3:', stateAfterDismiss);
    await client.screenshot('04-item3-dismissed.png');

    if (!stateAfterDismiss.bannerHeader.includes('2 Transactions Detected')) {
      throw new Error(`Expected "2 Transactions Detected", got: "${stateAfterDismiss.bannerHeader}"`);
    }

    // 7. Test Add Another Transaction Card
    console.log('➕ Adding another transaction card...');
    const addSuccess = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const addBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Add Another Transaction'));
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    `);
    console.log('Add another button clicked:', addSuccess);
    await sleep(600);

    const stateAfterAdd = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const bannerHeader = dialog.querySelector('h4')?.textContent || '';
      const readyBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Ready to Save')).length;
      const needsBadges = Array.from(dialog.querySelectorAll('span')).filter(s => s.textContent?.includes('Needs:')).length;
      return { bannerHeader, readyBadges, needsBadges };
    `);
    console.log('State After Adding New Card:', stateAfterAdd);
    await client.screenshot('05-added-new-transaction.png');

    if (!stateAfterAdd.bannerHeader.includes('3 Transactions Detected')) {
      throw new Error(`Expected 3 Transactions Detected after add, got: "${stateAfterAdd.bannerHeader}"`);
    }
    if (stateAfterAdd.needsBadges !== 1) {
      throw new Error(`Expected 1 Needs Details badge for blank new card, got: ${stateAfterAdd.needsBadges}`);
    }

    // 8. Test Switching Back to Manual Form
    console.log('🔄 Switching back to Manual Form...');
    const manualBtnClicked = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const manualBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Manual Form');
      if (manualBtn) {
        manualBtn.click();
        return true;
      }
      return false;
    `);
    console.log('Manual Form clicked:', manualBtnClicked);
    await sleep(600);

    const stateManualForm = await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const title = dialog.querySelector('[data-slot="responsive-dialog-title"], h2')?.textContent || '';
      const hasExpenseTab = Array.from(dialog.querySelectorAll('button')).some(b => b.textContent?.includes('Expense'));
      const hasIncomeTab = Array.from(dialog.querySelectorAll('button')).some(b => b.textContent?.includes('Income'));
      const hasTransferTab = Array.from(dialog.querySelectorAll('button')).some(b => b.textContent?.includes('Transfer'));
      return {
        title,
        hasExpenseTab,
        hasIncomeTab,
        hasTransferTab,
      };
    `);
    console.log('State Manual Form:', stateManualForm);
    await client.screenshot('06-reverted-to-manual-form.png');

    if (!stateManualForm.hasExpenseTab || !stateManualForm.hasTransferTab) {
      throw new Error('Failed to revert to standard manual entry form');
    }

    // 9. Close Modal
    console.log('❌ Closing modal...');
    await client.eval(`
      const dialog = document.querySelector('[data-slot="responsive-dialog-content"]');
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
      return true;
    `);
    await sleep(600);
    await client.screenshot('07-modal-closed.png');

    console.log('🎉 ALL MULTI-TRANSACTION MODAL BROWSER TESTS PASSED PERFECTLY!');
  } finally {
    client.close();
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
