import { describe, it, expect } from 'vitest';
import {
  refineItemBorrowers,
  updatePendingPhotoItemsWithUserInput,
  detectDuplicateItem,
  isValidUUID,
  normalizeISODate,
} from './photoParser';
import { ParsedPhotoItem } from '@/types';
import { UserFinancialContext, RecentLedgerItem, LoanSummaryItem } from './financialContext';

describe('refineItemBorrowers', () => {
  const mockContacts = [
    { id: 'c-1', name: 'John Doe' },
    { id: 'c-2', name: 'Sarah Smith' },
    { id: 'c-3', name: 'Mark' },
  ];

  it('matches individual contact names mentioned in line item descriptions', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Lunch for John Doe',
        amount: 250,
        type: 'receivable',
        date: '2026-10-14',
      },
      {
        id: '2',
        title: 'Sarah Smith coffee share',
        amount: 180,
        type: 'receivable',
        date: '2026-10-14',
      },
      {
        id: '3',
        title: 'Office supplies',
        amount: 500,
        type: 'receivable',
        date: '2026-10-14',
      },
    ];

    const refined = refineItemBorrowers(items, mockContacts);

    expect(refined[0].borrowerName).toBe('John Doe');
    expect(refined[0].contactId).toBe('c-1');
    expect(refined[0].missingFields).not.toContain('borrower');

    expect(refined[1].borrowerName).toBe('Sarah Smith');
    expect(refined[1].contactId).toBe('c-2');
    expect(refined[1].missingFields).not.toContain('borrower');

    expect(refined[2].borrowerName).toBeNull();
    expect(refined[2].contactId).toBeNull();
    expect(refined[2].missingFields).toContain('borrower');
  });

  it('prevents common receipt/food words from being assigned as borrower names', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Coffee',
        amount: 150,
        type: 'receivable',
        date: '2026-10-14',
        borrowerName: 'coffee',
      },
      {
        id: '2',
        title: 'Lunch meal',
        amount: 300,
        type: 'receivable',
        date: '2026-10-14',
        borrowerName: 'lunch',
      },
    ];

    const refined = refineItemBorrowers(items, mockContacts);

    expect(refined[0].borrowerName).toBeNull();
    expect(refined[0].contactId).toBeNull();
    expect(refined[0].missingFields).toContain('borrower');

    expect(refined[1].borrowerName).toBeNull();
    expect(refined[1].contactId).toBeNull();
    expect(refined[1].missingFields).toContain('borrower');
  });

  it('clears incorrect blanket-assigned borrowers across all items', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Item A',
        amount: 100,
        type: 'receivable',
        date: '2026-10-14',
        borrowerName: 'Unknown Person',
      },
      {
        id: '2',
        title: 'Item B',
        amount: 200,
        type: 'receivable',
        date: '2026-10-14',
        borrowerName: 'Unknown Person',
      },
    ];

    const refined = refineItemBorrowers(items, mockContacts);

    // Because 'Unknown Person' was blanket assigned across all items and not in contacts nor in title
    expect(refined[0].borrowerName).toBeNull();
    expect(refined[1].borrowerName).toBeNull();
  });

  it('detects prefix patterns like "Alice: " or "kay Mark"', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'kay Mark - 450',
        amount: 450,
        type: 'receivable',
        date: '2026-10-14',
      },
      {
        id: '2',
        title: 'Charlie: Snacks',
        amount: 120,
        type: 'receivable',
        date: '2026-10-14',
      },
    ];

    const refined = refineItemBorrowers(items, mockContacts);

    expect(refined[0].borrowerName).toBe('Mark');
    expect(refined[0].contactId).toBe('c-3');

    expect(refined[1].borrowerName).toBe('Charlie');
    expect(refined[1].contactId).toBeNull(); // Not in mockContacts yet, but captured as candidate
  });

  it('matches registered properties and assets by name or identifier', () => {
    const mockProperties = [
      { id: 'p-1', name: 'Toyota Vios', identifier: 'ABC 1234' },
      { id: 'p-2', name: 'Condo Unit 4B', identifier: 'UNIT-4B' },
    ];
    const mockContactsWithProp = [
      ...mockContacts,
      { id: 'c-prop-1', name: 'Toyota Vios' },
    ];

    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Gas share for Toyota Vios',
        amount: 1500,
        type: 'receivable',
        date: '2026-10-14',
      },
      {
        id: '2',
        title: 'Maintenance expense ABC 1234',
        amount: 3200,
        type: 'receivable',
        date: '2026-10-14',
      },
      {
        id: '3',
        title: 'Rent dues for Condo Unit 4B',
        amount: 18000,
        type: 'receivable',
        date: '2026-10-14',
      },
    ];

    const refined = refineItemBorrowers(items, mockContactsWithProp, mockProperties);

    expect(refined[0].borrowerName).toBe('Toyota Vios');
    expect(refined[0].contactId).toBe('c-prop-1');
    expect(refined[0].missingFields).not.toContain('borrower');

    expect(refined[1].borrowerName).toBe('Toyota Vios');
    expect(refined[1].contactId).toBe('c-prop-1');
    expect(refined[1].missingFields).not.toContain('borrower');

    expect(refined[2].borrowerName).toBe('Condo Unit 4B');
    // Not in contacts yet, so contactId is null but borrowerName is set
    expect(refined[2].contactId).toBeNull();
    expect(refined[2].missingFields).not.toContain('borrower');
  });
});

describe('updatePendingPhotoItemsWithUserInput', () => {
  const mockCtx = {
    todayISO: '2026-10-14',
    currentYear: 2026,
    categories: [],
    creditCards: [],
    savingsAccounts: [],
    properties: [],
    cardsContext: [],
    savingsContext: [],
    totalSpentThisMonth: 0,
    totalIncomeThisMonth: 0,
    totalLiquidSavings: 0,
    emergencyRunwayMonths: '0',
    totalReceivables: 0,
    totalPayables: 0,
    optimalCardResult: null,
    bestCardInfo: '',
    activeLoansList: [],
    activeSplitsList: [],
    contacts: [
      { id: 'c-1', name: 'John Doe' },
      { id: 'c-2', name: 'Sarah' },
    ],
  } as unknown as UserFinancialContext;

  it('does not falsely extract generic word "receivables" or "lunch" as borrower when converting to receivables', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Item 1',
        amount: 100,
        type: 'expense',
        date: '2026-10-14',
      },
      {
        id: '2',
        title: 'Item 2',
        amount: 200,
        type: 'expense',
        date: '2026-10-14',
      },
    ];

    const res = updatePendingPhotoItemsWithUserInput({
      items,
      userMessage: 'Save as receivables for lunch please',
      ctx: mockCtx,
    });

    expect(res.action).toBe('update');
    expect(res.updatedItems[0].type).toBe('receivable');
    expect(res.updatedItems[0].borrowerName).toBeNull();
    expect(res.updatedItems[1].borrowerName).toBeNull();
  });

  it('correctly sets borrower when user specifies a contact name', () => {
    const items: ParsedPhotoItem[] = [
      {
        id: '1',
        title: 'Item 1',
        amount: 100,
        type: 'expense',
        date: '2026-10-14',
      },
    ];

    const res = updatePendingPhotoItemsWithUserInput({
      items,
      userMessage: 'Receivables for John Doe',
      ctx: mockCtx,
    });

    expect(res.action).toBe('update');
    expect(res.updatedItems[0].type).toBe('receivable');
    expect(res.updatedItems[0].borrowerName).toBe('John Doe');
    expect(res.updatedItems[0].contactId).toBe('c-1');
  });
});

describe('detectDuplicateItem', () => {
  const mockRecentTx: RecentLedgerItem[] = [
    {
      id: 'tx-101',
      kind: 'expense',
      amount: 450,
      occurredOn: '2026-10-14',
      paymentMethod: 'cash',
      note: 'Lunch at Jollibee',
      categoryName: 'Food & Dining',
    },
    {
      id: 'tx-102',
      kind: 'expense',
      amount: 1200,
      occurredOn: '2026-10-13',
      paymentMethod: 'gcash',
      note: 'Shell Gasoline',
      categoryName: 'Transportation',
    },
  ];

  const mockActiveLoans: LoanSummaryItem[] = [
    {
      id: 'loan-201',
      borrower: 'H100',
      reason: 'Shared Dinner Bill',
      amount: 850,
      balanceRemaining: 850,
      status: 'unpaid',
      loanedOn: '2026-10-14',
      dueDate: null,
    },
  ];

  it('detects duplicate transaction with same amount, date, and matching description', () => {
    const item: ParsedPhotoItem = {
      id: 'p-1',
      title: 'Jollibee Food order',
      amount: 450,
      type: 'expense',
      date: '2026-10-14',
    };

    const result = detectDuplicateItem(item, mockRecentTx, mockActiveLoans);
    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
    expect(result?.matchedId).toBe('tx-101');
    expect(result?.matchedAmount).toBe(450);
    expect(result?.matchedDate).toBe('2026-10-14');
  });

  it('detects duplicate loan with same amount, date, and borrower', () => {
    const item: ParsedPhotoItem = {
      id: 'p-2',
      title: 'Dinner bill share',
      borrowerName: 'H100',
      amount: 850,
      type: 'receivable',
      date: '2026-10-14',
    };

    const result = detectDuplicateItem(item, mockRecentTx, mockActiveLoans);
    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
    expect(result?.matchedId).toBe('loan-201');
    expect(result?.matchedAmount).toBe(850);
  });

  it('does not flag duplicate if amount is different', () => {
    const item: ParsedPhotoItem = {
      id: 'p-3',
      title: 'Lunch at Jollibee',
      amount: 455,
      type: 'expense',
      date: '2026-10-14',
    };

    const result = detectDuplicateItem(item, mockRecentTx, mockActiveLoans);
    expect(result).toBeNull();
  });

  it('does not flag duplicate if date is different', () => {
    const item: ParsedPhotoItem = {
      id: 'p-4',
      title: 'Lunch at Jollibee',
      amount: 450,
      type: 'expense',
      date: '2026-10-10',
    };

    const result = detectDuplicateItem(item, mockRecentTx, mockActiveLoans);
    expect(result).toBeNull();
  });
});

describe('utilities: isValidUUID and normalizeISODate', () => {
  it('validates RFC4122 UUIDs correctly', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('c0a80101-0000-0000-0000-000000000000')).toBe(true);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
  });

  it('normalizes various date formats to ISO YYYY-MM-DD', () => {
    expect(normalizeISODate('2026-10-14')).toBe('2026-10-14');
    expect(normalizeISODate('2026-10-14T05:00:00Z')).toBe('2026-10-14');
    expect(normalizeISODate('10/14/2026')).toBe('2026-10-14');
    expect(normalizeISODate('')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

