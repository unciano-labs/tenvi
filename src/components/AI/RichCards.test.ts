import { describe, it, expect } from 'vitest';
import { checkParsedItemDuplicate, RecentTransactionOption } from './RichCards';
import { ParsedPhotoItem } from '@/types';

describe('checkParsedItemDuplicate', () => {
  const mockRecentTx: RecentTransactionOption[] = [
    {
      id: 'tx-1',
      amount: 450,
      occurred_on: '2026-11-05',
      payment_method: 'cash',
      credit_card_id: null,
      note: 'Jollibee Chickenjoy',
      category_name: 'Food & Dining',
    },
    {
      id: 'tx-2',
      amount: 1500,
      occurred_on: '2026-11-05',
      payment_method: 'credit_card',
      credit_card_id: 'card-bdo-platinum',
      note: 'Uniqlo Shirt',
      category_name: 'Shopping',
    },
    {
      id: 'tx-3',
      amount: 320,
      occurred_on: '2026-11-04',
      payment_method: 'credit_card',
      credit_card_id: 'card-bpi-gold',
      note: 'Starbucks Caramel Macchiato',
      category_name: 'Food & Dining',
    },
  ];

  it('detects duplicate when same date, amount, cash payment, and title match', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-1',
      title: 'Jollibee Chickenjoy meal',
      amount: 450,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedId).toBe('tx-1');
    expect(result.reason).toContain('Jollibee');
  });

  it('detects duplicate when same date, amount, credit card, and title match', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-2',
      title: 'Uniqlo Shirt',
      amount: 1500,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'credit_card',
      creditCardId: 'card-bdo-platinum',
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedId).toBe('tx-2');
  });

  it('does NOT flag duplicate if card is different (BPI vs BDO)', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-3',
      title: 'Uniqlo Shirt',
      amount: 1500,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'credit_card',
      creditCardId: 'card-bpi-gold', // different card
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT flag duplicate if payment method is cash instead of card', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-4',
      title: 'Uniqlo Shirt',
      amount: 1500,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash', // cash instead of BDO card
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT flag duplicate if date is different', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-5',
      title: 'Jollibee Chickenjoy meal',
      amount: 450,
      type: 'expense',
      date: '2026-11-06', // next day
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT flag duplicate if amount is different', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-6',
      title: 'Jollibee Chickenjoy meal',
      amount: 475, // different amount
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(false);
  });

  it('does NOT flag duplicate if title is completely different', () => {
    const item: ParsedPhotoItem = {
      id: 'parse-item-7',
      title: 'Mercury Drug Pharmacy',
      amount: 450,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item, [item], mockRecentTx);
    expect(result.isDuplicate).toBe(false);
  });

  it('detects duplicate item within the parsed receipt batch itself', () => {
    const item1: ParsedPhotoItem = {
      id: 'batch-item-1',
      title: 'Latte',
      amount: 180,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const item2: ParsedPhotoItem = {
      id: 'batch-item-2',
      title: 'Latte',
      amount: 180,
      type: 'expense',
      date: '2026-11-05',
      paymentMethod: 'cash',
      creditCardId: null,
    };

    const result = checkParsedItemDuplicate(item2, [item1, item2], []);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedId).toBe('batch-item-1');
    expect(result.reason).toContain('Duplicate in this receipt');
  });
});

