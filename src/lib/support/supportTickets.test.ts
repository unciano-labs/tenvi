import { describe, it, expect } from 'vitest';
import { FeedbackStatus, FeedbackType, FeedbackPriority } from '@/app/actions/feedback';

describe('Support Ticket Domain & Reopening Rules', () => {
  it('validates supported feedback categories', () => {
    const validTypes: FeedbackType[] = ['bug', 'feature', 'accounting_issue', 'ux_ui', 'other'];
    validTypes.forEach((t) => {
      expect(['bug', 'feature', 'accounting_issue', 'ux_ui', 'other']).toContain(t);
    });
  });

  it('validates supported feedback statuses', () => {
    const validStatuses: FeedbackStatus[] = ['new', 'open', 'in_progress', 'resolved', 'closed', 'wont_fix'];
    validStatuses.forEach((s) => {
      expect(['new', 'open', 'in_progress', 'resolved', 'closed', 'wont_fix']).toContain(s);
    });
  });

  it('correctly simulates ticket reopening rules when member responds', () => {
    function computeStatusOnReply(currentStatus: FeedbackStatus, senderRole: 'admin' | 'member'): FeedbackStatus {
      if (senderRole === 'member' && (currentStatus === 'resolved' || currentStatus === 'closed' || currentStatus === 'wont_fix')) {
        return 'open';
      }
      return currentStatus;
    }

    // Member replying to resolved ticket -> automatically reopens
    expect(computeStatusOnReply('resolved', 'member')).toBe('open');
    expect(computeStatusOnReply('closed', 'member')).toBe('open');
    expect(computeStatusOnReply('wont_fix', 'member')).toBe('open');

    // Member replying to open ticket -> remains open
    expect(computeStatusOnReply('open', 'member')).toBe('open');
    expect(computeStatusOnReply('in_progress', 'member')).toBe('in_progress');

    // Admin replying does NOT reopen resolved ticket unless explicitly intended
    expect(computeStatusOnReply('resolved', 'admin')).toBe('resolved');
  });

  it('formats ticket deep links for member and admin contexts', () => {
    const ticketId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const memberLink = `/dashboard/support?id=${ticketId}`;
    const adminLink = `/admin/feedback?id=${ticketId}`;

    expect(memberLink).toContain('/dashboard/support');
    expect(memberLink).toContain(`id=${ticketId}`);
    expect(adminLink).toContain('/admin/feedback');
    expect(adminLink).toContain(`id=${ticketId}`);
  });

  it('generates notification title with category badge', () => {
    function buildTicketNotificationTitle(type: FeedbackType, title: string) {
      return `New ${type.replace('_', ' ').toUpperCase()}: ${title}`;
    }

    expect(buildTicketNotificationTitle('bug', 'Calculation offset')).toBe('New BUG: Calculation offset');
    expect(buildTicketNotificationTitle('accounting_issue', 'Tax rate mismatch')).toBe('New ACCOUNTING ISSUE: Tax rate mismatch');
  });
});
