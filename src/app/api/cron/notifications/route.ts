import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import {
  calculateNextDueDate,
  formatDate,
  formatMoney,
  calculateDocumentExpiryStatus,
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
} from '@/lib/notifications/templates';
import { sendGmailEmail } from '@/lib/notifications/email';
import { sendHttpSms } from '@/lib/notifications/sms';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch all users notification settings
    const { data: allSettingsList, error: settingsError } = await supabase
      .from('bili_notification_settings')
      .select('*')
      .eq('website_id', WEBSITE_ID);

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const settingsByUser = new Map((allSettingsList || []).map((s) => [s.user_id, s]));

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let totalDispatched = 0;
    const results = [];

    // 2. Process each user's credit cards if notifications enabled
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
        .eq('is_active', true);

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

      const cardItemsSummary = upcoming
        .map(
          (item, idx) =>
            `${idx + 1}) ${item.card.bank_name} ${item.card.name} (•••• ${item.card.last_4}): ${item.dueInfo.label} (${formatDate(item.dueInfo.nextDueDate)})${item.card.credit_limit > 0 ? ` • Limit ${formatMoney(item.card.credit_limit)}` : ''}`
        )
        .join('\n');

      const cardVars = buildCardNotificationVariables({
        cardCount: upcoming.length,
        cardList: cardItemsSummary,
        daysBefore: targetDays,
        appUrl: 'https://bili.app/dashboard/cards',
      });

      const smsTemplate = settings.card_sms_template || DEFAULT_CARD_SMS_TEMPLATE;
      const emailSubTemplate = settings.card_email_subject || DEFAULT_CARD_EMAIL_SUBJECT;
      const emailBodyTemplate = settings.card_email_body || DEFAULT_CARD_EMAIL_BODY;

      const smsBody = interpolateTemplate(smsTemplate, cardVars);
      const emailSubject = interpolateTemplate(emailSubTemplate, cardVars);
      const emailBody = interpolateTemplate(emailBodyTemplate, cardVars);

      // Dispatch SMS via httpSMS Gateway
      if (notify_sms && phone_number && !alreadySentChannels.has('sms')) {
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
        }
      }

      // Dispatch Email via Gmail SMTP
      if (notify_email && email_address && !alreadySentChannels.has('email')) {
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
        totalDispatched++;
      }

      results.push({
        userId: user_id,
        upcomingCards: upcoming.length,
      });
    }

    // 3. Process Borrower Loans (Upcoming payments due within 3 days)
    const { data: activeLoans } = await supabase
      .from('bili_loans')
      .select(`
        *,
        contact:bili_contacts(name, phone, email),
        installments:bili_loan_installments(id, installment_number, due_date, amount, is_paid)
      `)
      .eq('website_id', WEBSITE_ID)
      .neq('status', 'paid')
      .eq('notify_borrower', true);

    let totalLoanDispatched = 0;
    const loanResults = [];

    if (activeLoans && activeLoans.length > 0) {
      for (const loan of activeLoans) {
        const borrowerPhone = loan.borrower_phone || (loan as any).contact?.phone;
        const borrowerEmail = loan.borrower_email || (loan as any).contact?.email;
        const borrowerName = (loan as any).contact?.name || 'Borrower';

        if (!borrowerPhone && !borrowerEmail) continue;

        // Check next upcoming payment / installment
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
        }

        if (!targetDueDate) continue;

        // Calculate days remaining
        const dueDateObj = new Date(targetDueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        const todayCopy = new Date(today);
        todayCopy.setHours(0, 0, 0, 0);

        const diffTime = dueDateObj.getTime() - todayCopy.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Check if within 3 days window (0, 1, 2, or 3 days until due)
        if (daysDiff < 0 || daysDiff > 3) continue;

        // Check if already notified for this loan today
        const { data: todayLoanLogs } = await supabase
          .from('bili_notification_logs')
          .select('channel')
          .eq('website_id', WEBSITE_ID)
          .eq('loan_id', loan.id)
          .eq('sent_date', todayStr);

        const alreadySentLoanChannels = new Set((todayLoanLogs || []).map((l) => l.channel));

        // Get lender's custom templates if configured
        const lenderSettings = settingsByUser.get(loan.user_id);
        const loanVars = buildLoanNotificationVariables({
          borrowerName,
          loanTitle: loan.reason,
          dueDate: targetDueDate,
          daysRemaining: daysDiff,
          amountDue: dueAmount,
          installmentInfo: installmentNote,
          balanceRemaining: Number(loan.balance_remaining),
          lenderName: 'Bili',
        });

        const smsTemplate = lenderSettings?.loan_sms_template || DEFAULT_LOAN_SMS_TEMPLATE;
        const emailSubTemplate = lenderSettings?.loan_email_subject || DEFAULT_LOAN_EMAIL_SUBJECT;
        const emailBodyTemplate = lenderSettings?.loan_email_body || DEFAULT_LOAN_EMAIL_BODY;

        const smsBody = interpolateTemplate(smsTemplate, loanVars);
        const emailSubject = interpolateTemplate(emailSubTemplate, loanVars);
        const emailBody = interpolateTemplate(emailBodyTemplate, loanVars);

        // Dispatch SMS to borrower via httpSMS Gateway
        if (borrowerPhone && !alreadySentLoanChannels.has('sms')) {
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
            totalLoanDispatched++;
          }
        }

        // Dispatch Email to borrower via Gmail SMTP
        if (borrowerEmail && !alreadySentLoanChannels.has('email')) {
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
          totalLoanDispatched++;
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

    // 4. Process Expiring Property & Asset Documents (OR/CR, Insurance, LTFRB Franchise, etc.)
    const { data: expiringDocs } = await supabase
      .from('bili_property_documents')
      .select(`
        *,
        property:bili_properties(name)
      `)
      .eq('website_id', WEBSITE_ID)
      .not('expiry_date', 'is', null);

    let totalDocsDispatched = 0;
    const docResults = [];

    if (expiringDocs && expiringDocs.length > 0) {
      for (const doc of expiringDocs) {
        if (!doc.notify_email && !doc.notify_sms) continue;

        const expiryStatus = calculateDocumentExpiryStatus(
          doc.expiry_date,
          doc.notify_before_days || 30,
          today
        );

        // Only notify if expiring soon or expired within the last 14 days
        if (!expiryStatus.isExpiringSoon || (expiryStatus.daysRemaining !== null && expiryStatus.daysRemaining < -14)) {
          continue;
        }

        // Check if already notified for this document today
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

        // Dispatch SMS
        if (doc.notify_sms && recipientPhone && !alreadySentDocChannels.has('sms')) {
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
            totalDocsDispatched++;
          }
        }

        // Dispatch Email
        if (doc.notify_email && recipientEmail && !alreadySentDocChannels.has('email')) {
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
            totalDocsDispatched++;
          }
        }

        // Update last_notified_at
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

    return NextResponse.json({
      success: true,
      cards: {
        processedUsers: (allSettingsList || []).length,
        totalDispatched,
        results,
      },
      loans: {
        totalDispatched: totalLoanDispatched,
        results: loanResults,
      },
      documents: {
        totalDispatched: totalDocsDispatched,
        results: docResults,
      },
    });
  } catch (error: any) {
    console.error('Error running daily notifications cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

