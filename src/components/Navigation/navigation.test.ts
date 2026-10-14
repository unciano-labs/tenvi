import { describe, it, expect } from 'vitest';
import { MAIN_NAV_ITEMS, MOBILE_BOTTOM_NAV_ITEMS } from './nav-config';

describe('Navigation Items (TNV-008 & TNV-009)', () => {
  it('contains exactly 9 main navigation items', () => {
    expect(MAIN_NAV_ITEMS).toHaveLength(9);
  });

  it('contains no duplicate href targets', () => {
    const hrefs = MAIN_NAV_ITEMS.map((item) => item.href);
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(MAIN_NAV_ITEMS.length);
  });

  it('contains no duplicate labels', () => {
    const labels = MAIN_NAV_ITEMS.map((item) => item.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(MAIN_NAV_ITEMS.length);
  });

  it('has Alerts & Settings exactly once', () => {
    const settingsItems = MAIN_NAV_ITEMS.filter(
      (item) => item.href === '/dashboard/settings' || item.label.includes('Settings')
    );
    expect(settingsItems).toHaveLength(1);
    expect(settingsItems[0].label).toBe('Alerts & Settings');
  });

  it('has Credit Cards instead of Cards & Due Dates (TNV-009)', () => {
    const cardItem = MAIN_NAV_ITEMS.find((item) => item.href === '/dashboard/cards');
    expect(cardItem).toBeDefined();
    expect(cardItem?.label).toBe('Credit Cards');
  });

  it('correctly maps active index for each route without cross-tab desynchronization', () => {
    function getActiveIndex(pathname: string) {
      return MOBILE_BOTTOM_NAV_ITEMS.findIndex((item) =>
        item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
      );
    }

    expect(getActiveIndex('/dashboard')).toBe(0); // Home
    expect(getActiveIndex('/dashboard/transactions')).toBe(1); // Spending - NEVER 3 (Savings)
    expect(getActiveIndex('/dashboard/cards')).toBe(2); // Cards
    expect(getActiveIndex('/dashboard/savings')).toBe(3); // Savings
    expect(getActiveIndex('/dashboard/loans')).toBe(4); // Loans
    expect(getActiveIndex('/dashboard/properties')).toBe(-1); // Not in bottom bar
    expect(getActiveIndex('/dashboard/receivables')).toBe(-1); // Not in bottom bar
  });
});
