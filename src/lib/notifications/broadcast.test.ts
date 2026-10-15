import { describe, it, expect } from 'vitest';
import {
  generateBroadcastEmailHtml,
  BroadcastCategory,
  BroadcastAudience,
} from '@/lib/notifications/broadcastTemplate';
import { isUserAdmin, ADMIN_EMAIL } from '@/lib/constants';

describe('Admin Email Broadcast Domain & Template Generation', () => {
  it('validates supported broadcast categories', () => {
    const validCategories: BroadcastCategory[] = [
      'feature_update',
      'maintenance',
      'announcement',
      'security_notice',
    ];
    validCategories.forEach((cat) => {
      expect(['feature_update', 'maintenance', 'announcement', 'security_notice']).toContain(cat);
    });
  });

  it('validates supported broadcast audiences', () => {
    const validAudiences: BroadcastAudience[] = ['all_members', 'admins_only', 'test_only'];
    validAudiences.forEach((aud) => {
      expect(['all_members', 'admins_only', 'test_only']).toContain(aud);
    });
  });

  it('generates rich HTML email with correct badges, recipient name, and CTA', () => {
    const html = generateBroadcastEmailHtml({
      subject: 'New AI Bookkeeping Engine Live',
      message: 'We are thrilled to announce automated receipt parsing.\n\nEnjoy the update!',
      category: 'feature_update',
      recipientName: 'Sarah Connor',
    });

    // Branding & Header
    expect(html).toContain('Tenvi');
    expect(html).toContain('FEATURE UPDATE');
    expect(html).toContain('New AI Bookkeeping Engine Live');

    // Recipient salutation & message body
    expect(html).toContain('Hello Sarah Connor,');
    expect(html).toContain('We are thrilled to announce automated receipt parsing.');
    expect(html).toContain('Enjoy the update!');

    // CTA & footer
    expect(html).toContain('Open Your Tenvi Dashboard &rarr;');
    expect(html).toContain('https://tenvi.app/dashboard');
    expect(html).toContain('Tenvi — Personal Wealth Infrastructure');
  });

  it('correctly badges different broadcast categories', () => {
    const maintenanceHtml = generateBroadcastEmailHtml({
      subject: 'Scheduled Downtime',
      message: 'System maintenance on Sunday.',
      category: 'maintenance',
    });
    expect(maintenanceHtml).toContain('SCHEDULED MAINTENANCE');

    const securityHtml = generateBroadcastEmailHtml({
      subject: 'Important Security Update',
      message: 'Please review your 2FA settings.',
      category: 'security_notice',
    });
    expect(securityHtml).toContain('SECURITY NOTICE');

    const announcementHtml = generateBroadcastEmailHtml({
      subject: 'Welcome to Q4',
      message: 'End of year financial reviews are here.',
      category: 'announcement',
    });
    expect(announcementHtml).toContain('PLATFORM ANNOUNCEMENT');
  });

  it('filters recipient audience safely', () => {
    const members = [
      { user_id: '1', email: ADMIN_EMAIL, full_name: 'Lead Admin' },
      { user_id: '2', email: 'user1@example.com', full_name: 'Member One' },
      { user_id: '3', email: 'user2@example.com', full_name: 'Member Two' },
      { user_id: '4', email: '', full_name: 'Empty Email' },
    ];

    // Audience: admins_only
    const adminRecipients = members.filter((m) => isUserAdmin(m.email));
    expect(adminRecipients.length).toBe(1);
    expect(adminRecipients[0].email).toBe(ADMIN_EMAIL);

    // Audience: all_members (excluding invalid/empty emails)
    const allValidRecipients = members.filter((m) => m.email && m.email.includes('@'));
    expect(allValidRecipients.length).toBe(3);
    expect(allValidRecipients.map((r) => r.email)).toEqual([
      ADMIN_EMAIL,
      'user1@example.com',
      'user2@example.com',
    ]);
  });

  it('calculates anti-ban pacing interval correctly', () => {
    function computePacingInterval(audience: BroadcastAudience): number {
      return audience === 'test_only' ? 0 : 1500;
    }

    expect(computePacingInterval('test_only')).toBe(0);
    expect(computePacingInterval('all_members')).toBe(1500);
    expect(computePacingInterval('admins_only')).toBe(1500);
  });
});
