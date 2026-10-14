/**
 * Double-Entry General Ledger Engine
 * Commercial FinTech standard for balanced double-entry accounting (Luca Pacioli principles)
 * Every financial movement generates strictly balanced debit and credit entries.
 * Assets + Expenses = Liabilities + Equity + Revenues
 */

export type AccountClassification =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

export interface JournalLineInput {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  classification?: AccountClassification;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntryInput {
  description: string;
  entryDate: string;
  referenceType?: string;
  referenceId?: string;
  lines: JournalLineInput[];
}

export interface BalanceValidationResult {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  error?: string;
}

/**
 * Validates that journal entry lines satisfy the fundamental zero-sum balance constraint:
 * Sum(Debits) == Sum(Credits) and both > 0
 */
export function validateJournalEntryBalance(lines: JournalLineInput[]): BalanceValidationResult {
  if (!lines || lines.length < 2) {
    return {
      isBalanced: false,
      totalDebit: 0,
      totalCredit: 0,
      difference: 0,
      error: 'A double-entry journal entry requires at least 2 lines (at least one debit and one credit).',
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit < 0 || credit < 0) {
      return {
        isBalanced: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} has negative monetary values which are disallowed.`,
      };
    }

    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      return {
        isBalanced: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} must have either a positive debit OR credit, never both and never zero.`,
      };
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  totalDebit = Number(totalDebit.toFixed(2));
  totalCredit = Number(totalCredit.toFixed(2));
  const diff = Number(Math.abs(totalDebit - totalCredit).toFixed(2));
  const isBalanced = diff === 0 && totalDebit > 0;

  return {
    isBalanced,
    totalDebit,
    totalCredit,
    difference: diff,
    error: isBalanced
      ? undefined
      : `Unbalanced entry: Total debits (₱${totalDebit}) must equal total credits (₱${totalCredit}). Difference: ₱${diff}`,
  };
}

export interface StandardJournalParams {
  type: 'income' | 'expense' | 'transfer' | 'card_settlement' | 'loan_disbursement' | 'loan_repayment' | 'depreciation';
  amount: number;
  description: string;
  date?: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationAccountId: string;
  destinationAccountName: string;
  interestAmount?: number;
  referenceId?: string;
}

/**
 * Creates a standard balanced double-entry journal entry for any business event
 */
export function createStandardJournalEntry(params: StandardJournalParams): JournalEntryInput {
  const amt = Number(Number(params.amount || 0).toFixed(2));
  const entryDate = params.date || new Date().toISOString().split('T')[0];

  switch (params.type) {
    case 'expense':
      // Debit: Expense Account | Credit: Asset/Liability (Cash/Bank or Credit Card)
      return {
        description: params.description,
        entryDate,
        referenceType: 'expense',
        referenceId: params.referenceId,
        lines: [
          {
            accountId: params.destinationAccountId,
            accountName: params.destinationAccountName,
            classification: 'expense',
            debit: amt,
            credit: 0,
            memo: 'Expense incurred',
          },
          {
            accountId: params.sourceAccountId,
            accountName: params.sourceAccountName,
            classification: 'asset',
            debit: 0,
            credit: amt,
            memo: 'Payment outflow',
          },
        ],
      };

    case 'income':
      // Debit: Asset (Cash/Bank) | Credit: Revenue/Income
      return {
        description: params.description,
        entryDate,
        referenceType: 'income',
        referenceId: params.referenceId,
        lines: [
          {
            accountId: params.destinationAccountId,
            accountName: params.destinationAccountName,
            classification: 'asset',
            debit: amt,
            credit: 0,
            memo: 'Funds received',
          },
          {
            accountId: params.sourceAccountId,
            accountName: params.sourceAccountName,
            classification: 'revenue',
            debit: 0,
            credit: amt,
            memo: 'Revenue recognized',
          },
        ],
      };

    case 'transfer':
    case 'card_settlement':
      // Debit: Destination Asset or Liability (reduces liability) | Credit: Source Asset
      return {
        description: params.description,
        entryDate,
        referenceType: params.type,
        referenceId: params.referenceId,
        lines: [
          {
            accountId: params.destinationAccountId,
            accountName: params.destinationAccountName,
            classification: params.type === 'card_settlement' ? 'liability' : 'asset',
            debit: amt,
            credit: 0,
            memo: params.type === 'card_settlement' ? 'Liability reduction' : 'Inter-account inflow',
          },
          {
            accountId: params.sourceAccountId,
            accountName: params.sourceAccountName,
            classification: 'asset',
            debit: 0,
            credit: amt,
            memo: 'Inter-account outflow',
          },
        ],
      };

    case 'loan_disbursement':
      // Debit: Asset (Loan Receivable) | Credit: Asset (Cash/Bank)
      return {
        description: params.description,
        entryDate,
        referenceType: 'loan_disbursement',
        referenceId: params.referenceId,
        lines: [
          {
            accountId: params.destinationAccountId,
            accountName: params.destinationAccountName,
            classification: 'asset',
            debit: amt,
            credit: 0,
            memo: 'Loan receivable created',
          },
          {
            accountId: params.sourceAccountId,
            accountName: params.sourceAccountName,
            classification: 'asset',
            debit: 0,
            credit: amt,
            memo: 'Disbursement outflow',
          },
        ],
      };

    case 'loan_repayment': {
      // Repayment can have principal portion and interest portion
      const interest = Number(Number(params.interestAmount || 0).toFixed(2));
      const principal = Number(Math.max(0, amt - interest).toFixed(2));

      const lines: JournalLineInput[] = [
        {
          accountId: params.destinationAccountId,
          accountName: params.destinationAccountName,
          classification: 'asset',
          debit: amt,
          credit: 0,
          memo: 'Total cash received',
        },
        {
          accountId: params.sourceAccountId,
          accountName: params.sourceAccountName,
          classification: 'asset',
          debit: 0,
          credit: principal,
          memo: 'Loan principal reduction',
        },
      ];

      if (interest > 0) {
        lines.push({
          accountId: 'interest-income-account',
          accountName: 'Interest Income',
          classification: 'revenue',
          debit: 0,
          credit: interest,
          memo: 'Interest revenue earned',
        });
      }

      return {
        description: params.description,
        entryDate,
        referenceType: 'loan_repayment',
        referenceId: params.referenceId,
        lines,
      };
    }

    case 'depreciation':
      // Debit: Depreciation Expense | Credit: Accumulated Depreciation (Contra-Asset)
      return {
        description: params.description,
        entryDate,
        referenceType: 'depreciation',
        referenceId: params.referenceId,
        lines: [
          {
            accountId: params.destinationAccountId,
            accountName: params.destinationAccountName,
            classification: 'expense',
            debit: amt,
            credit: 0,
            memo: 'Depreciation expense',
          },
          {
            accountId: params.sourceAccountId,
            accountName: params.sourceAccountName,
            classification: 'asset',
            debit: 0,
            credit: amt,
            memo: 'Accumulated depreciation contra-asset',
          },
        ],
      };
  }
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode?: string;
  accountName: string;
  classification: AccountClassification;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

/**
 * Computes a formal accounting Trial Balance from all posted journal lines
 */
export function computeTrialBalance(
  rawLines: Array<{
    accountId: string;
    accountCode?: string;
    accountName: string;
    classification: AccountClassification;
    debit: number;
    credit: number;
  }>
): TrialBalanceReport {
  const map = new Map<
    string,
    {
      accountCode?: string;
      accountName: string;
      classification: AccountClassification;
      totalDebit: number;
      totalCredit: number;
    }
  >();

  for (const line of rawLines) {
    const existing = map.get(line.accountId) || {
      accountCode: line.accountCode,
      accountName: line.accountName,
      classification: line.classification,
      totalDebit: 0,
      totalCredit: 0,
    };

    existing.totalDebit += Number(line.debit || 0);
    existing.totalCredit += Number(line.credit || 0);
    map.set(line.accountId, existing);
  }

  const rows: TrialBalanceRow[] = [];
  let sumDebits = 0;
  let sumCredits = 0;

  map.forEach((data, accountId) => {
    const totalDebit = Number(data.totalDebit.toFixed(2));
    const totalCredit = Number(data.totalCredit.toFixed(2));

    // For Assets and Expenses, normal balance is Debit (Debit - Credit)
    // For Liabilities, Equity, and Revenue, normal balance is Credit (Credit - Debit)
    let netDebit = 0;
    let netCredit = 0;

    if (data.classification === 'asset' || data.classification === 'expense') {
      const net = totalDebit - totalCredit;
      if (net >= 0) {
        netDebit = net;
      } else {
        netCredit = Math.abs(net);
      }
    } else {
      const net = totalCredit - totalDebit;
      if (net >= 0) {
        netCredit = net;
      } else {
        netDebit = Math.abs(net);
      }
    }

    sumDebits += totalDebit;
    sumCredits += totalCredit;

    rows.push({
      accountId,
      accountCode: data.accountCode,
      accountName: data.accountName,
      classification: data.classification,
      totalDebit,
      totalCredit,
      netDebit: Number(netDebit.toFixed(2)),
      netCredit: Number(netCredit.toFixed(2)),
    });
  });

  const totalDebits = Number(sumDebits.toFixed(2));
  const totalCredits = Number(sumCredits.toFixed(2));

  return {
    rows,
    totalDebits,
    totalCredits,
    isBalanced: totalDebits === totalCredits,
  };
}
