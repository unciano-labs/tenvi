'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { billSplitSchema } from '@/lib/validations/schemas';
import { sendGmailEmail } from '@/lib/notifications/email';
import { sendHttpSms } from '@/lib/notifications/sms';

export async function createBillSplitAction(data: any) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to split bills.' };
  }

  const parsed = billSplitSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid bill split details' };
  }

  const { title, totalAmount, creditCardId, occurredOn, note, participants } =
    parsed.data;

  // 1. Insert parent bill split
  const { data: split, error: splitErr } = await supabase
    .from('bili_bill_splits')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      title,
      total_amount: totalAmount,
      credit_card_id: creditCardId || null,
      occurred_on: occurredOn,
      note: note || null,
    })
    .select('id')
    .single();

  if (splitErr || !split) {
    console.error('Error inserting bill split:', splitErr);
    return { error: 'Failed to create bill split. Please try again.' };
  }

  // 2. Resolve participants and insert
  for (const p of participants) {
    let contactId = p.contactId;

    if (!contactId && p.name && p.name.trim()) {
      // Find or create contact
      const { data: existingContact } = await supabase
        .from('bili_contacts')
        .select('id')
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id)
        .ilike('name', p.name.trim())
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact } = await supabase
          .from('bili_contacts')
          .insert({
            website_id: WEBSITE_ID,
            user_id: user.id,
            name: p.name.trim(),
          })
          .select('id')
          .single();

        if (newContact) {
          contactId = newContact.id;
        }
      }
    }

    if (contactId) {
      await supabase.from('bili_split_participants').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        split_id: split.id,
        contact_id: contactId,
        share_amount: p.shareAmount,
        is_paid: false,
      });
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/splits');
  return { success: true };
}

export async function toggleParticipantPaidAction(
  splitId: string,
  participantId: string,
  isPaid: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('bili_split_participants')
    .update({
      is_paid: isPaid,
      paid_on: isPaid ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .eq('split_id', splitId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error toggling paid status:', error);
    return { error: 'Failed to update paid status' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/splits');
  revalidatePath('/dashboard/receivables');
  return { success: true };
}

export async function deleteBillSplitAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('bili_bill_splits')
    .delete()
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting bill split:', error);
    return { error: 'Failed to delete split' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/splits');
  revalidatePath('/dashboard/receivables');
  return { success: true };
}

export async function sendSplitParticipantReminderAction({
  participantId,
  channel,
  customMessage,
}: {
  participantId: string;
  channel: 'sms' | 'email';
  customMessage?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: participant, error: fetchErr } = await supabase
    .from('bili_split_participants')
    .select(`
      *,
      contact:bili_contacts(*),
      split:bili_bill_splits(*)
    `)
    .eq('id', participantId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !participant) {
    return { error: 'Participant record not found' };
  }

  const contact = participant.contact;
  const split = participant.split;
  const contactName = contact?.name || 'Friend';
  const recipientPhone = contact?.phone;
  const recipientEmail = contact?.email;

  if (channel === 'sms' && !recipientPhone) {
    return { error: `No mobile number registered for ${contactName}.` };
  }
  if (channel === 'email' && !recipientEmail) {
    return { error: `No email address registered for ${contactName}.` };
  }

  const { data: settings } = await supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  const formattedShare = `₱${Number(participant.share_amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const defaultMessage = `Hi ${contactName}, friendly reminder for your share of "${split?.title || 'Shared Bill'}" (${formattedShare}). Thanks!`;
  const subject = `Friendly Reminder: Shared Bill - ${split?.title || 'Bill Split'}`;
  const body = customMessage || defaultMessage;
  const recipient = channel === 'sms' ? recipientPhone! : recipientEmail!;
  const todayStr = new Date().toISOString().split('T')[0];

  let dispatchStatus: 'sent' | 'simulated' | 'failed' = 'sent';
  let dispatchError: string | null = null;

  if (channel === 'email') {
    const emailRes = await sendGmailEmail({
      to: recipientEmail!,
      subject,
      text: body,
      customUser: settings?.smtp_email,
      customPass: settings?.smtp_app_password,
    });
    dispatchStatus = emailRes.status;
    dispatchError = emailRes.error || null;
  } else {
    const smsRes = await sendHttpSms({
      to: recipientPhone!,
      message: body,
      customApiKey: settings?.httpsms_api_key,
      customFrom: settings?.httpsms_from_number,
    });
    dispatchStatus = smsRes.status;
    dispatchError = smsRes.error || null;
  }

  // Insert into notification logs
  await supabase.from('bili_notification_logs').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    channel,
    recipient,
    card_names: null,
    loan_id: null,
    email_subject: channel === 'email' ? subject : null,
    message_body: channel === 'sms' ? body : `Subject: ${subject}\n\n${body}`,
    status: dispatchStatus,
    error_message: dispatchError,
    sent_date: todayStr,
  });

  revalidatePath('/dashboard/splits');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/settings');

  let statusFeedback = `Reminder sent to ${recipient} via ${channel.toUpperCase()}!`;
  if (dispatchStatus === 'simulated') {
    statusFeedback = `Simulation logged for ${recipient}: ${dispatchError || 'Provider not configured'}`;
  } else if (dispatchStatus === 'failed') {
    statusFeedback = `Failed to send ${channel.toUpperCase()} to ${recipient}: ${dispatchError}`;
  }

  return {
    success: dispatchStatus !== 'failed',
    channel,
    recipient,
    status: dispatchStatus,
    message: statusFeedback,
  };
}
