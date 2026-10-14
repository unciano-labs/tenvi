import { describe, it, expect } from 'vitest';
import {
  validateJournalEntryBalance,
  createStandardJournalEntry,
  computeTrialBalance,
} from './generalLedger';

describe('Double-Entry General Ledger Engine (Task 4.2)', () => {
  it('validates strictly balanced journal entries (Luca Pacioli principle)', () => {
    // Valid balanced entry
    const balancedLines = [
      { accountId: 'acc-1', debit: 1500, credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: 1500 },
    ];
    const validResult = validateJournalEntryBalance(balancedLines);
    expect(validResult.isBalanced).toBe(true);
    expect(validResult.totalDebit).toBe(1500);
    expect(validResult.totalCredit).toBe(1500);
    expect(validResult.difference).toBe(0);

    // Unbalanced entry
    const unbalancedLines = [
      { accountId: 'acc-1', debit: 1500, credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: 1400 },
    ];
    const invalidResult = validateJournalEntryBalance(unbalancedLines);
    expect(invalidResult.isBalanced).toBe(false);
    expect(invalidResult.difference).toBe(100);
    expect(invalidResult.error).toContain('Unbalanced entry');
  });

  it('rejects entries with negative numbers or both debit and credit on the same line', () => {
    const negativeLines = [
      { accountId: 'acc-1', debit: -500, credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: -500 },
    ];
    expect(validateJournalEntryBalance(negativeLines).isBalanced).toBe(false);

    const doubleSidedLines = [
      { accountId: 'acc-1', debit: 500, credit: 500 },
      { accountId: 'acc-2', debit: 0, credit: 1000 },
    ];
    expect(validateJournalEntryBalance(doubleSidedLines).isBalanced).toBe(false);
  });

  it('generates compliant standard double-entry journal entries for business events', () => {
    // 1. Expense
    const expenseEntry = createStandardJournalEntry({
      type: 'expense',
      amount: 450,
      description: 'Grocery shopping',
      sourceAccountId: 'bank-bpi',
      sourceAccountName: 'BPI Savings',
      destinationAccountId: 'exp-groceries',
      destinationAccountName: 'Groceries Expense',
    });
    expect(validateJournalEntryBalance(expenseEntry.lines).isBalanced).toBe(true);
    expect(expenseEntry.lines[0].debit).toBe(450); // Expense debited
    expect(expenseEntry.lines[1].credit).toBe(450); // Asset credited

    // 2. Inter-account Transfer
    const transferEntry = createStandardJournalEntry({
      type: 'transfer',
      amount: 10000,
      description: 'Transfer BPI to Maya',
      sourceAccountId: 'bank-bpi',
      sourceAccountName: 'BPI Savings',
      destinationAccountId: 'wallet-maya',
      destinationAccountName: 'Maya Wallet',
    });
    expect(validateJournalEntryBalance(transferEntry.lines).isBalanced).toBe(true);

    // 3. Loan Repayment with interest
    const repaymentEntry = createStandardJournalEntry({
      type: 'loan_repayment',
      amount: 5500,
      interestAmount: 500,
      description: 'Friend loan installment 1',
      sourceAccountId: 'loan-rec-1',
      sourceAccountName: 'John Doe Loan Receivable',
      destinationAccountId: 'bank-bpi',
      destinationAccountName: 'BPI Savings',
    });
    expect(validateJournalEntryBalance(repaymentEntry.lines).isBalanced).toBe(true);
    expect(repaymentEntry.lines).toHaveLength(3);
    // Debit cash received: 5500
    expect(repaymentEntry.lines[0].debit).toBe(5500);
    // Credit loan principal: 5000
    expect(repaymentEntry.lines[1].credit).toBe(5000);
    // Credit interest income: 500
    expect(repaymentEntry.lines[2].credit).toBe(500);
  });

  it('computes a complete accounting Trial Balance and verifies balanced books', () => {
    const rawLines = [
      { accountId: '1010', accountName: 'Cash on Hand', classification: 'asset' as const, debit: 50000, credit: 10000 },
      { accountId: '1020', accountName: 'Bank Savings', classification: 'asset' as const, debit: 120000, credit: 30000 },
      { accountId: '2010', accountName: 'Credit Card Payable', classification: 'liability' as const, debit: 15000, credit: 25000 },
      { accountId: '3000', accountName: 'Owner Equity', classification: 'equity' as const, debit: 0, credit: 100000 },
      { accountId: '4000', accountName: 'Salary Revenue', classification: 'revenue' as const, debit: 0, credit: 40000 },
      { accountId: '5010', accountName: 'Food Expense', classification: 'expense' as const, debit: 20000, credit: 0 },
    ];

    const tb = computeTrialBalance(rawLines);
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebits).toBe(205000);
    expect(tb.totalCredits).toBe(205000);
    expect(tb.rows.length).toBe(6);
  });
});
