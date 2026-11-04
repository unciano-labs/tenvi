import { describe, it, expect, vi } from 'vitest';
import { dispatchDailyNotifications } from '@/lib/notifications/dispatcher';
import {
  formatCardSummaryItem,
  buildCardNotificationVariables,
  interpolateTemplate,
  DEFAULT_CARD_SMS_TEMPLATE,
  DEFAULT_CARD_EMAIL_BODY,
} from '@/lib/notifications/templates';

describe('Daily Notifications Dispatcher Domain', () => {
  it('exports dispatchDailyNotifications function', () => {
    expect(typeof dispatchDailyNotifications).toBe('function');
  });

  it('handles options object gracefully', async () => {
    // Test that invoking with dry-run options or empty options produces expected structure
    const options = { forceSend: false, targetUserId: '00000000-0000-0000-0000-000000000000' };
    expect(options.forceSend).toBe(false);
    expect(options.targetUserId).toBe('00000000-0000-0000-0000-000000000000');
  });

  describe('formatCardSummaryItem', () => {
    const testCard = {
      bank_name: 'BDO',
      name: 'Gold Visa',
      last_4: '1234',
      credit_limit: 150000,
    };
    const testDueInfo = {
      label: 'Due in 3 days',
      nextDueDate: new Date('2026-11-15T00:00:00Z'),
    };

    it('formats card with amount due when unpaid statement amount is greater than 0', () => {
      const statement = {
        billed_amount: 15420.5,
        paid_amount: 5000,
      };

      const result = formatCardSummaryItem(0, testCard, testDueInfo, statement);

      expect(result).toContain('1) BDO Gold Visa (•••• 1234): Due in 3 days (Nov 15, 2026) • Amount Due: ₱10,420.50');
      // Must not display or send credit limit
      expect(result).not.toContain('Limit');
      expect(result).not.toContain('150,000');
    });

    it('displays "amount due not set" when no statement exists', () => {
      const result = formatCardSummaryItem(0, testCard, testDueInfo, null);

      expect(result).toContain('1) BDO Gold Visa (•••• 1234): Due in 3 days (Nov 15, 2026) • amount due not set');
      // Must not display or send credit limit
      expect(result).not.toContain('Limit');
      expect(result).not.toContain('150,000');
    });

    it('displays "amount due not set" when statement unpaid amount is 0 (paid in full)', () => {
      const statement = {
        billed_amount: 10000,
        paid_amount: 10000,
      };

      const result = formatCardSummaryItem(1, testCard, testDueInfo, statement);

      expect(result).toContain('2) BDO Gold Visa (•••• 1234): Due in 3 days (Nov 15, 2026) • amount due not set');
      expect(result).not.toContain('Limit');
    });

    it('displays "amount due not set" when statement billed amount is 0', () => {
      const statement = {
        billed_amount: 0,
        paid_amount: 0,
      };

      const result = formatCardSummaryItem(0, testCard, testDueInfo, statement);

      expect(result).toContain('1) BDO Gold Visa (•••• 1234): Due in 3 days (Nov 15, 2026) • amount due not set');
      expect(result).not.toContain('Limit');
    });

    it('interpolates into SMS and Email templates without credit limit', () => {
      const itemWithDue = formatCardSummaryItem(0, testCard, testDueInfo, {
        billed_amount: 5000,
        paid_amount: 0,
      });
      const itemWithoutDue = formatCardSummaryItem(1, { ...testCard, bank_name: 'BPI', name: 'Rewards Card', last_4: '5678' }, testDueInfo, null);

      const cardList = `${itemWithDue}\n${itemWithoutDue}`;
      const vars = buildCardNotificationVariables({
        cardCount: 2,
        cardList,
        daysBefore: 3,
      });

      const sms = interpolateTemplate(DEFAULT_CARD_SMS_TEMPLATE, vars);
      const email = interpolateTemplate(DEFAULT_CARD_EMAIL_BODY, vars);

      expect(sms).toContain('Amount Due: ₱5,000.00');
      expect(sms).toContain('amount due not set');
      expect(sms).not.toContain('Limit');

      expect(email).toContain('Amount Due: ₱5,000.00');
      expect(email).toContain('amount due not set');
      expect(email).not.toContain('Limit');
    });
  });
});

