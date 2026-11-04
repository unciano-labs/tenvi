import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import {
  calculateNextDueDate,
  formatDate,
  formatMoney,
  calculateDocumentExpiryStatus,
  getTodayManila,
  getTodayManilaString,
} from '@/lib/finance/calculations';
import {
  DEFAULT_LOAN_SMS_TEMPLATE,
  DEFAULT_LOAN_EMAIL_SUBJECT,
  DEFAULT_LOAN_EMAIL_BODY,
  DEFAULT_CARD_SMS_TEMPLATE,
  DEFAULT_CARD_EMAIL_SUBJECT,
  DEFAULT_CARD_EMAIL_BODY,
  DEFAULT_DOCUMENT_SMS_TEMPLATE,
  DEFAULT_DOCUMENT_EMAIL_SUBJECT,
  DEFAULT_DOCUMENT_EMAIL_BODY,
  interpolateTemplate,
  buildLoanNotificationVariables,
  buildCardNotificationVariables,
  buildDocumentNotificationVariables,
  formatCardSummaryItem,
} from '@/lib/notifications/templates';
import { sendGmailEmail } from '@/lib/notifications/email';
import { sendHttpSms } from '@/lib/notifications/sms';

export interface DispatchNotificationsOptions {
  forceSend?: boolean;
  targetUserId?: string;
}

export interface DispatchSummary {
  success: boolean;
  totalDispatched: number;
  cards: {
    processedUsers: number;
    totalDispatched: number;
    results: Array<{ userId: string; upcomingCards: number }>;
  };
  loans: {
    totalDispatched: number;
    results: Array<{
      loanId: string;
      borrowerName: string;
      targetDueDate: string;
      daysDiff: number;
      dueAmount: number;
    }>;
  };
  documents: {
    totalDispatched: number;
    results: Array<{
      documentId: string;
      propertyName: string;
      title: string;
      daysRemaining: number | null;
    }>;
  };
  error?: string;
}

/**
 * Core notification dispatch engine for Tenvi.
 * Evaluates upcoming credit card bills, borrower loans, and expiring legal documents,
 * enforcing the once-per-day rule per channel unless forceSend is requested.
 */
export async function dispatchDailyNotifications(
  options: DispatchNotificationsOptions = {}
): Promise<DispatchSummary> {
  const { forceSend = false, targetUserId } = options;
  const supabase = createAdminClient();

  const today = getTodayManila();
  const todayStr = getTodayManilaString(today);

  let totalDispatched = 0;
  let totalCardsDispatched = 0;
  const cardResults: Array<{ userId: string; upcomingCards: number }> = [];

  // 1. Fetch notification settings
  let settingsQuery = supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID);

  if (targetUserId) {
    settingsQuery = settingsQuery.eq('user_id', targetUserId);
  }

  const { data: allSettingsList, error: settingsError } = await settingsQuery;

  if (settingsError) {
    console.error('[NotificationDispatcher] Error querying notification settings:', settingsError);
    return {
      success: false,
      totalDispatched: 0,
      cards: { processedUsers: 0, totalDispatched: 0, results: [] },
      loans: { totalDispatched: 0, results: [] },
      documents: { totalDispatched: 0, results: [] },
      error: settingsError.message,
    };
  }

  const settingsByUser = new Map((allSettingsList || []).map((s) => [s.user_id, s]));

  // 2. Process Credit Cards (evaluate cards due within window)
  const activeCardSettings = (allSettingsList || []).filter(
    (s) => s.notify_email || s.notify_sms
  );

  for (const settings of activeCardSettings) {
    const { user_id, notify_email, notify_sms, days_before, email_address, phone_number } = settings;
    const targetDays = days_before || 3;

    // Fetch active cards for this user
    const { data: cards } = await supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!cards || cards.length === 0) continue;

    // Filter cards due within window
    const upcoming = cards
      .map((c) => ({
        card: c,
        dueInfo: calculateNextDueDate(c.due_day, today),
      }))
      .filter((item) => item.dueInfo.daysRemaining >= 0 && item.dueInfo.daysRemaining <= targetDays)
      .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining);

    if (upcoming.length === 0) continue;

    // Check if already notified today
    const { data: todayLogs } = await supabase
      .from('bili_notification_logs')
      .select('channel')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user_id)
      .eq('sent_date', todayStr);

    const alreadySentChannels = new Set((todayLogs || []).map((l) => l.channel));
    const cardNamesList = upcoming.map((i) => `${i.card.bank_name} ${i.card.name}`).join(', ');

    // Fetch latest statements for upcoming cards to extract amount due
    const cardIds = upcoming.map((i) => i.card.id);
    const { data: statements } = await supabase
      .from('bili_card_statements')
      .select('credit_card_id, billed_amount, paid_amount, cycle_end, due_date')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user_id)
      .in('credit_card_id', cardIds)
      .order('cycle_end', { ascending: false });

    const statementsByCard = new Map<string, any>();
    (statements || []).forEach((st) => {
      if (!statementsByCard.has(st.credit_card_id)) {
        statementsByCard.set(st.credit_card_id, st);
      }
    });

    const cardItemsSummary = upcoming
      .map((item, idx) =>
        formatCardSummaryItem(
          idx,
          item.card,
          item.dueInfo,
          statementsByCard.get(item.card.id)
        )
      )
      .join('\n');

    const cardVars = buildCardNotificationVariables({
      cardCount: upcoming.length,
      cardList: cardItemsSummary,
      daysBefore: targetDays,
      appUrl: 'https://tenvi.app/dashboard/cards',
    });

    const smsTemplate = settings.card_sms_template || DEFAULT_CARD_SMS_TEMPLATE;
    const emailSubTemplate = settings.card_email_subject || DEFAULT_CARD_EMAIL_SUBJECT;
    const emailBodyTemplate = settings.card_email_body || DEFAULT_CARD_EMAIL_BODY;

    const smsBody = interpolateTemplate(smsTemplate, cardVars);
    const emailSubject = interpolateTemplate(emailSubTemplate, cardVars);
    const emailBody = interpolateTemplate(emailBodyTemplate, cardVars);

    // Dispatch SMS via httpSMS Gateway
    if (notify_sms && phone_number && (forceSend || !alreadySentChannels.has('sms'))) {
      const smsRes = await sendHttpSms({
        to: phone_number,
        message: smsBody,
        customApiKey: settings.httpsms_api_key,
        customFrom: settings.httpsms_from_number,
      });

      await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id,
        channel: 'sms',
        recipient: phone_number,
        card_names: cardNamesList,
        message_body: smsBody,
        status: smsRes.status,
        error_message: smsRes.error || null,
        sent_date: todayStr,
      });

      if (smsRes.success) {
        totalDispatched++;
        totalCardsDispatched++;
      }
    }

    // Dispatch Email via Gmail SMTP
    if (notify_email && email_address && (forceSend || !alreadySentChannels.has('email'))) {
      const emailRes = await sendGmailEmail({
        to: email_address,
        subject: emailSubject,
        text: emailBody,
        customUser: settings.smtp_email,
        customPass: settings.smtp_app_password,
      });

      await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id,
        channel: 'email',
        recipient: email_address,
        card_names: cardNamesList,
        email_subject: emailSubject,
        message_body: `Subject: ${emailSubject}\n\n${emailBody}`,
        status: emailRes.status,
        error_message: emailRes.error || null,
        sent_date: todayStr,
      });

      if (emailRes.success) {
        totalDispatched++;
        totalCardsDispatched++;
      }
    }

    // Update last_notified_at
    await supabase
      .from('bili_notification_settings')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user_id);

    cardResults.push({
      userId: user_id,
      upcomingCards: upcoming.length,
    });
  }

  // 3. Process Borrower Loans (upcoming installments/due dates within 3 days)
  let loanQuery = supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(name, phone, email),
      installments:bili_loan_installments(id, installment_number, due_date, amount, is_paid)
    `)
    .eq('website_id', WEBSITE_ID)
    .neq('status', 'paid')
    .eq('notify_borrower', true);

  if (targetUserId) {
    loanQuery = loanQuery.eq('user_id', targetUserId);
  }

  const { data: activeLoans } = await loanQuery;

  let totalLoanDispatched = 0;
  const loanResults: Array<{
    loanId: string;
    borrowerName: string;
    targetDueDate: string;
    daysDiff: number;
    dueAmount: number;
  }> = [];

  if (activeLoans && activeLoans.length > 0) {
    for (const loan of activeLoans) {
      const borrowerPhone = loan.borrower_phone || (loan as any).contact?.phone;
      const borrowerEmail = loan.borrower_email || (loan as any).contact?.email;
      const borrowerName = (loan as any).contact?.name || 'Borrower';

      if (!borrowerPhone && !borrowerEmail) continue;

      let targetDueDate: string | null = null;
      let dueAmount = Number(loan.balance_remaining);
      let installmentNote = '';

      if (loan.is_installment && Array.isArray((loan as any).installments)) {
        const unpaid = (loan as any).installments
          .filter((i: any) => !i.is_paid && i.due_date)
          .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

        if (unpaid.length > 0) {
          targetDueDate = unpaid[0].due_date;
          dueAmount = Number(unpaid[0].amount);
          installmentNote = `Month #${unpaid[0].installment_number} of ${loan.installment_months || unpaid.length}`;
        }
      } else if (loan.due_date) {
        targetDueDate = loan.due_date;
      } else if (loan.monthly_due_day) {
        const now = new Date(today);
        const dueDay = Math.min(31, Math.max(1, Number(loan.monthly_due_day)));
        const dueYear = now.getFullYear();
        const dueMonth = now.getMonth();
        const lastDayThisMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
        const thisMonthDue = new Date(dueYear, dueMonth, Math.min(dueDay, lastDayThisMonth));
        thisMonthDue.setHours(0, 0, 0, 0);

        const todayMidnight = new Date(today);
        todayMidnight.setHours(0, 0, 0, 0);

        if (thisMonthDue.getTime() < todayMidnight.getTime()) {
          const nextMonth = dueMonth + 1;
          const lastDayNextMonth = new Date(dueYear, nextMonth + 1, 0).getDate();
          targetDueDate = new Date(dueYear, nextMonth, Math.min(dueDay, lastDayNextMonth)).toISOString().split('T')[0];
        } else {
          targetDueDate = thisMonthDue.toISOString().split('T')[0];
        }

        if (loan.monthly_amount && Number(loan.monthly_amount) > 0) {
          dueAmount = Number(loan.monthly_amount);
        }
        installmentNote = Number(loan.monthly_interest_rate || 0) > 0 ? 'Monthly Interest' : 'Monthly Payment';
      }

      if (!targetDueDate) continue;

      const dueDateObj = new Date(targetDueDate);
      dueDateObj.setHours(0, 0, 0, 0);
      const todayCopy = new Date(today);
      todayCopy.setHours(0, 0, 0, 0);

      const diffTime = dueDateObj.getTime() - todayCopy.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysDiff < 0 || daysDiff > 3) continue;

      const { data: todayLoanLogs } = await supabase
        .from('bili_notification_logs')
        .select('channel')
        .eq('website_id', WEBSITE_ID)
        .eq('loan_id', loan.id)
        .eq('sent_date', todayStr);

      const alreadySentLoanChannels = new Set((todayLoanLogs || []).map((l) => l.channel));
      const lenderSettings = settingsByUser.get(loan.user_id);

      const loanVars = buildLoanNotificationVariables({
        borrowerName,
        loanTitle: loan.reason,
        dueDate: targetDueDate,
        daysRemaining: daysDiff,
        amountDue: dueAmount,
        installmentInfo: installmentNote,
        balanceRemaining: Number(loan.balance_remaining),
        lenderName: 'Tenvi',
      });

      const smsTemplate = lenderSettings?.loan_sms_template || DEFAULT_LOAN_SMS_TEMPLATE;
      const emailSubTemplate = lenderSettings?.loan_email_subject || DEFAULT_LOAN_EMAIL_SUBJECT;
      const emailBodyTemplate = lenderSettings?.loan_email_body || DEFAULT_LOAN_EMAIL_BODY;

      const smsBody = interpolateTemplate(smsTemplate, loanVars);
      const emailSubject = interpolateTemplate(emailSubTemplate, loanVars);
      const emailBody = interpolateTemplate(emailBodyTemplate, loanVars);

      if (borrowerPhone && (forceSend || !alreadySentLoanChannels.has('sms'))) {
        const smsRes = await sendHttpSms({
          to: borrowerPhone,
          message: smsBody,
          customApiKey: lenderSettings?.httpsms_api_key,
          customFrom: lenderSettings?.httpsms_from_number,
        });

        await supabase.from('bili_notification_logs').insert({
          website_id: WEBSITE_ID,
          user_id: loan.user_id,
          channel: 'sms',
          recipient: borrowerPhone,
          card_names: null,
          loan_id: loan.id,
          message_body: smsBody,
          status: smsRes.status,
          error_message: smsRes.error || null,
          sent_date: todayStr,
        });

        if (smsRes.success) {
          totalDispatched++;
          totalLoanDispatched++;
        }
      }

      if (borrowerEmail && (forceSend || !alreadySentLoanChannels.has('email'))) {
        const emailRes = await sendGmailEmail({
          to: borrowerEmail,
          subject: emailSubject,
          text: emailBody,
          customUser: lenderSettings?.smtp_email,
          customPass: lenderSettings?.smtp_app_password,
        });

        await supabase.from('bili_notification_logs').insert({
          website_id: WEBSITE_ID,
          user_id: loan.user_id,
          channel: 'email',
          recipient: borrowerEmail,
          card_names: null,
          loan_id: loan.id,
          email_subject: emailSubject,
          message_body: `Subject: ${emailSubject}\n\n${emailBody}`,
          status: emailRes.status,
          error_message: emailRes.error || null,
          sent_date: todayStr,
        });

        if (emailRes.success) {
          totalDispatched++;
          totalLoanDispatched++;
        }
      }

      loanResults.push({
        loanId: loan.id,
        borrowerName,
        targetDueDate,
        daysDiff,
        dueAmount,
      });
    }
  }

  // 4. Process Expiring Property & Asset Documents
  let docsQuery = supabase
    .from('bili_property_documents')
    .select(`
      *,
      property:bili_properties(name)
    `)
    .eq('website_id', WEBSITE_ID)
    .not('expiry_date', 'is', null);

  if (targetUserId) {
    docsQuery = docsQuery.eq('user_id', targetUserId);
  }

  const { data: expiringDocs } = await docsQuery;

  let totalDocsDispatched = 0;
  const docResults: Array<{
    documentId: string;
    propertyName: string;
    title: string;
    daysRemaining: number | null;
  }> = [];

  if (expiringDocs && expiringDocs.length > 0) {
    for (const doc of expiringDocs) {
      if (!doc.notify_email && !doc.notify_sms) continue;

      const expiryStatus = calculateDocumentExpiryStatus(
        doc.expiry_date,
        doc.notify_before_days || 30,
        today
      );

      if (!expiryStatus.isExpiringSoon || (expiryStatus.daysRemaining !== null && expiryStatus.daysRemaining < -14)) {
        continue;
      }

      const { data: todayDocLogs } = await supabase
        .from('bili_notification_logs')
        .select('channel')
        .eq('website_id', WEBSITE_ID)
        .eq('document_id', doc.id)
        .eq('sent_date', todayStr);

      const alreadySentDocChannels = new Set((todayDocLogs || []).map((l) => l.channel));
      const userSettings = settingsByUser.get(doc.user_id);
      const recipientEmail = userSettings?.email_address;
      const recipientPhone = userSettings?.phone_number;

      const propertyName = doc.property?.name || 'Asset';
      const docVars = buildDocumentNotificationVariables({
        propertyName,
        documentTitle: doc.title,
        documentType: (doc.document_type || 'Document').replace('_', ' ').toUpperCase(),
        documentNumber: doc.document_number,
        expiryDate: doc.expiry_date,
        daysRemaining: expiryStatus.daysRemaining ?? 0,
        appUrl: `https://tenvi.app/dashboard/properties/${doc.property_id}`,
      });

      const smsBody = interpolateTemplate(DEFAULT_DOCUMENT_SMS_TEMPLATE, docVars);
      const emailSubject = interpolateTemplate(DEFAULT_DOCUMENT_EMAIL_SUBJECT, docVars);
      const emailBody = interpolateTemplate(DEFAULT_DOCUMENT_EMAIL_BODY, docVars);

      if (doc.notify_sms && recipientPhone && (forceSend || !alreadySentDocChannels.has('sms'))) {
        const smsRes = await sendHttpSms({
          to: recipientPhone,
          message: smsBody,
          customApiKey: userSettings?.httpsms_api_key,
          customFrom: userSettings?.httpsms_from_number,
        });

        await supabase.from('bili_notification_logs').insert({
          website_id: WEBSITE_ID,
          user_id: doc.user_id,
          channel: 'sms',
          recipient: recipientPhone,
          document_id: doc.id,
          message_body: smsBody,
          status: smsRes.status,
          error_message: smsRes.error || null,
          sent_date: todayStr,
        });

        if (smsRes.success) {
          totalDispatched++;
          totalDocsDispatched++;
        }
      }

      if (doc.notify_email && recipientEmail && (forceSend || !alreadySentDocChannels.has('email'))) {
        const emailRes = await sendGmailEmail({
          to: recipientEmail,
          subject: emailSubject,
          text: emailBody,
          customUser: userSettings?.smtp_email,
          customPass: userSettings?.smtp_app_password,
        });

        await supabase.from('bili_notification_logs').insert({
          website_id: WEBSITE_ID,
          user_id: doc.user_id,
          channel: 'email',
          recipient: recipientEmail,
          document_id: doc.id,
          email_subject: emailSubject,
          message_body: `Subject: ${emailSubject}\n\n${emailBody}`,
          status: emailRes.status,
          error_message: emailRes.error || null,
          sent_date: todayStr,
        });

        if (emailRes.success) {
          totalDispatched++;
          totalDocsDispatched++;
        }
      }

      await supabase
        .from('bili_property_documents')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', doc.id);

      docResults.push({
        documentId: doc.id,
        propertyName,
        title: doc.title,
        daysRemaining: expiryStatus.daysRemaining,
      });
    }
  }

  return {
    success: true,
    totalDispatched,
    cards: {
      processedUsers: (allSettingsList || []).length,
      totalDispatched: totalCardsDispatched,
      results: cardResults,
    },
    loans: {
      totalDispatched: totalLoanDispatched,
      results: loanResults,
    },
    documents: {
      totalDispatched: totalDocsDispatched,
      results: docResults,
    },
  };
}

