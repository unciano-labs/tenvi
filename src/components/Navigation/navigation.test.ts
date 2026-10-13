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

  it('contains the 5 most-used destinations for mobile bottom navigation (TNV-033)', () => {
    expect(MOBILE_BOTTOM_NAV_ITEMS).toHaveLength(5);
    const hrefs = MOBILE_BOTTOM_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/transactions',
      '/dashboard/cards',
      '/dashboard/savings',
      '/dashboard/loans',
    ]);
  });
});
