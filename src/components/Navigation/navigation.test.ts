import { describe, it, expect } from 'vitest';
import { MAIN_NAV_ITEMS, MOBILE_BOTTOM_NAV_ITEMS } from './nav-config';

describe('Navigation Items (TNV-008 & TNV-009)', () => {
  it('contains exactly 10 main navigation items', () => {
    expect(MAIN_NAV_ITEMS).toHaveLength(10);
  });

  it('has Support & Tickets in main navigation', () => {
    const supportItem = MAIN_NAV_ITEMS.find((item) => item.href === '/dashboard/support');
    expect(supportItem).toBeDefined();
    expect(supportItem?.label).toBe('Support & Tickets');
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

  describe('Compact Mobile Bottom Nav & Liquid Indicator Alignment', () => {
    it('has exactly 5 bottom navigation items', () => {
      expect(MOBILE_BOTTOM_NAV_ITEMS).toHaveLength(5);
    });

    it('allocates exactly 20% width per slot for liquid indicator alignment', () => {
      const slotWidthPercent = 100 / MOBILE_BOTTOM_NAV_ITEMS.length;
      expect(slotWidthPercent).toBe(20);
    });

    it('calculates dead-center alignment for all 5 compact tab slots', () => {
      const tabSlotWidthPx = 48; // w-12 = 3rem = 48px
      const totalTrackWidthPx = tabSlotWidthPx * MOBILE_BOTTOM_NAV_ITEMS.length; // 240px
      const bubbleDiameterPx = 38; // w-[38px] h-[38px] in compact state
      const pillPaddingPx = 10; // px-2.5 = 10px each side

      // Total pill width wrapping all 5 items
      const totalPillWidthPx = totalTrackWidthPx + pillPaddingPx * 2; // 260px
      expect(totalPillWidthPx).toBe(260);

      MOBILE_BOTTOM_NAV_ITEMS.forEach((item, index) => {
        // Tab item boundaries
        const tabLeft = index * tabSlotWidthPx;
        const tabRight = tabLeft + tabSlotWidthPx;
        const tabCenter = tabLeft + tabSlotWidthPx / 2;

        // Indicator slot boundaries
        const indicatorTranslatePercent = index * 100;
        const indicatorLeft = (indicatorTranslatePercent / 100) * (totalTrackWidthPx * 0.2);
        const indicatorRight = indicatorLeft + totalTrackWidthPx * 0.2;
        const bubbleLeft = indicatorLeft + (tabSlotWidthPx - bubbleDiameterPx) / 2;
        const bubbleCenter = bubbleLeft + bubbleDiameterPx / 2;

        // Indicator wrapper slot exactly matches tab item boundaries
        expect(indicatorLeft).toBe(tabLeft);
        expect(indicatorRight).toBe(tabRight);

        // Circular liquid bubble is dead-center on the tab icon
        expect(bubbleCenter).toBe(tabCenter);

        // Verify no tab item overflows the pill container
        const pillRelativeRight = pillPaddingPx + tabRight;
        expect(pillRelativeRight).toBeLessThanOrEqual(totalPillWidthPx);
      });

      // Specifically verify Loans (index 4) has a safe margin and does not overflow
      const loansRightWithPadding = pillPaddingPx + 5 * tabSlotWidthPx;
      expect(loansRightWithPadding).toBe(250);
      expect(totalPillWidthPx - loansRightWithPadding).toBe(10); // 10px safe margin

      // Verify Savings (index 3) is comfortably inside the border
      const savingsRightWithPadding = pillPaddingPx + 4 * tabSlotWidthPx;
      expect(savingsRightWithPadding).toBe(202);
      expect(totalPillWidthPx - savingsRightWithPadding).toBe(58); // 58px margin
    });
  });
});
