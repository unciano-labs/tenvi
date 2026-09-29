'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID, DOCUMENT_TYPE_PRESETS, DocumentTypeOption } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { PropertyDocument, PropertyDocumentType } from '@/types';
import { calculateDocumentExpiryStatus } from '@/lib/finance/calculations';
import {
  DEFAULT_DOCUMENT_SMS_TEMPLATE,
  DEFAULT_DOCUMENT_EMAIL_SUBJECT,
  DEFAULT_DOCUMENT_EMAIL_BODY,
  interpolateTemplate,
  buildDocumentNotificationVariables,
} from '@/lib/notifications/templates';
import { sendGmailEmail } from '@/lib/notifications/email';
import { sendHttpSms } from '@/lib/notifications/sms';


/**
 * Fetch all documents connected to a specific property
 */
export async function getPropertyDocumentsAction(
  propertyId: string
): Promise<{ documents: PropertyDocument[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { documents: [], error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('bili_property_documents')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching property documents:', error);
      return { documents: [], error: error.message };
    }

    return { documents: (data || []) as PropertyDocument[] };
  } catch (err: any) {
    console.error('Error in getPropertyDocumentsAction:', err);
    return { documents: [], error: err.message };
  }
}

/**
 * Fetch all documents across all properties for the authenticated user,
 * joined with property metadata for a unified compliance dashboard.
 */
export async function getAllUserDocumentsAction(): Promise<{
  documents: PropertyDocument[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { documents: [], error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('bili_property_documents')
      .select(`
        *,
        property:bili_properties(*)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching all user documents:', error);
      return { documents: [], error: error.message };
    }

    return { documents: (data || []) as PropertyDocument[] };
  } catch (err: any) {
    console.error('Error in getAllUserDocumentsAction:', err);
    return { documents: [], error: err.message };
  }
}

/**
 * Upload a document connected to a property or asset
 */
export async function uploadPropertyDocumentAction(
  formData: FormData
): Promise<{ success: boolean; document?: PropertyDocument; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const propertyId = formData.get('property_id') as string;
    const title = (formData.get('title') as string)?.trim();
    const documentType = (formData.get('document_type') as PropertyDocumentType) || 'other';
    const documentNumber = (formData.get('document_number') as string)?.trim() || null;
    const issueDate = (formData.get('issue_date') as string)?.trim() || null;
    const expiryDate = (formData.get('expiry_date') as string)?.trim() || null;
    const notifyBeforeDays = Number(formData.get('notify_before_days')) || 30;
    const notifyEmail = formData.get('notify_email') !== 'false';
    const notifySms = formData.get('notify_sms') === 'true';
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!propertyId) {
      return { success: false, error: 'Property ID is required.' };
    }

    if (!title) {
      return { success: false, error: 'Document title is required.' };
    }

    // Verify property ownership
    const { data: prop, error: propErr } = await supabase
      .from('bili_properties')
      .select('id, name')
      .eq('id', propertyId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (propErr || !prop) {
      return { success: false, error: 'Property not found or unauthorized.' };
    }

    const file = formData.get('file') as File | null;
    let fileUrl = '#no-file';
    let fileName = 'No file attached';
    let fileSize = 0;
    let mimeType = 'application/pdf';

    if (file && file.size > 0) {
      // Validate file size (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        return { success: false, error: 'File size must not exceed 15MB.' };
      }

      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type || 'application/octet-stream';

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${propertyId}/${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('bili-documents')
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        return { success: false, error: `Failed to upload file: ${uploadErr.message}` };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('bili-documents').getPublicUrl(uploadData.path);

      fileUrl = publicUrl || uploadData.path;
    }

    // Insert record into bili_property_documents
    const { data: newDoc, error: insertErr } = await supabase
      .from('bili_property_documents')
      .insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        property_id: propertyId,
        title,
        document_type: documentType,
        document_number: documentNumber,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notify_before_days: notifyBeforeDays,
        notify_email: notifyEmail,
        notify_sms: notifySms,
        notes,
      })
      .select('*')
      .single();

    if (insertErr) {
      console.error('Database insert error:', insertErr);
      return { success: false, error: insertErr.message };
    }

    revalidatePath('/dashboard/properties');
    revalidatePath(`/dashboard/properties/${propertyId}`);

    return { success: true, document: newDoc as PropertyDocument };
  } catch (err: any) {
    console.error('Error in uploadPropertyDocumentAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing property document record
 */
export async function updatePropertyDocumentAction(
  documentId: string,
  formData: FormData
): Promise<{ success: boolean; document?: PropertyDocument; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    // Fetch existing document to verify ownership
    const { data: existingDoc, error: fetchErr } = await supabase
      .from('bili_property_documents')
      .select('*')
      .eq('id', documentId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !existingDoc) {
      return { success: false, error: 'Document not found or unauthorized.' };
    }

    const title = (formData.get('title') as string)?.trim();
    const documentType = (formData.get('document_type') as PropertyDocumentType) || existingDoc.document_type;
    const documentNumber = (formData.get('document_number') as string)?.trim() || null;
    const issueDate = (formData.get('issue_date') as string)?.trim() || null;
    const expiryDate = (formData.get('expiry_date') as string)?.trim() || null;
    const notifyBeforeDays = Number(formData.get('notify_before_days')) || existingDoc.notify_before_days || 30;
    const notifyEmail = formData.get('notify_email') !== 'false';
    const notifySms = formData.get('notify_sms') === 'true';
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!title) {
      return { success: false, error: 'Document title is required.' };
    }

    let fileUrl = existingDoc.file_url;
    let fileName = existingDoc.file_name;
    let fileSize = existingDoc.file_size;
    let mimeType = existingDoc.mime_type;

    const file = formData.get('file') as File | null;
    if (file && file.size > 0) {
      if (file.size > 15 * 1024 * 1024) {
        return { success: false, error: 'File size must not exceed 15MB.' };
      }

      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type || 'application/octet-stream';

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${existingDoc.property_id}/${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('bili-documents')
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadErr) {
        return { success: false, error: `Failed to upload replacement file: ${uploadErr.message}` };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('bili-documents').getPublicUrl(uploadData.path);

      fileUrl = publicUrl || uploadData.path;
    }

    const { data: updatedDoc, error: updateErr } = await supabase
      .from('bili_property_documents')
      .update({
        title,
        document_type: documentType,
        document_number: documentNumber,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        notify_before_days: notifyBeforeDays,
        notify_email: notifyEmail,
        notify_sms: notifySms,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/dashboard/properties');
    revalidatePath(`/dashboard/properties/${existingDoc.property_id}`);

    return { success: true, document: updatedDoc as PropertyDocument };
  } catch (err: any) {
    console.error('Error in updatePropertyDocumentAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a document from Supabase storage and database
 */
export async function deletePropertyDocumentAction(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { data: doc, error: fetchErr } = await supabase
      .from('bili_property_documents')
      .select('*')
      .eq('id', documentId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !doc) {
      return { success: false, error: 'Document not found.' };
    }

    // Attempt to remove file from storage if it belongs to bili-documents
    if (doc.file_url && doc.file_url.includes('bili-documents')) {
      try {
        const parts = doc.file_url.split('/bili-documents/');
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1].split('?')[0]);
          await supabase.storage.from('bili-documents').remove([filePath]);
        }
      } catch (storageErr) {
        console.warn('Storage delete non-fatal error:', storageErr);
      }
    }

    const { error: deleteErr } = await supabase
      .from('bili_property_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (deleteErr) {
      return { success: false, error: deleteErr.message };
    }

    revalidatePath('/dashboard/properties');
    revalidatePath(`/dashboard/properties/${doc.property_id}`);

    return { success: true };
  } catch (err: any) {
    console.error('Error in deletePropertyDocumentAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Trigger an immediate notification check or test reminder for a single document
 */
export async function sendDocumentExpiryAlertAction(
  documentId: string
): Promise<{ success: boolean; message?: string; error?: string; channels?: string[] }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { data: doc, error: docErr } = await supabase
      .from('bili_property_documents')
      .select(`
        *,
        property:bili_properties(*)
      `)
      .eq('id', documentId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (docErr || !doc) {
      return { success: false, error: 'Document not found.' };
    }

    if (!doc.expiry_date) {
      return { success: false, error: 'This document does not have an expiration date set.' };
    }

    // Fetch user notification settings
    const { data: settings } = await supabase
      .from('bili_notification_settings')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    const recipientEmail = settings?.email_address || user.email;
    const recipientPhone = settings?.phone_number;

    const expiryStatus = calculateDocumentExpiryStatus(doc.expiry_date, doc.notify_before_days);
    const propertyName = doc.property?.name || 'Asset';

    const presetInfo = DOCUMENT_TYPE_PRESETS.find((p) => p.value === doc.document_type);
    const categoryLabel = presetInfo?.label.split('(')[0].trim() || doc.document_type;

    const docVars = buildDocumentNotificationVariables({
      propertyName,
      documentTitle: doc.title,
      documentType: categoryLabel,
      documentNumber: doc.document_number,
      expiryDate: doc.expiry_date,
      daysRemaining: expiryStatus.daysRemaining ?? 0,
      appUrl: `https://tenvi.app/dashboard/properties/${doc.property_id}`,
    });

    const emailSubject = interpolateTemplate(DEFAULT_DOCUMENT_EMAIL_SUBJECT, docVars);
    const emailBody = interpolateTemplate(DEFAULT_DOCUMENT_EMAIL_BODY, docVars);
    const smsBody = interpolateTemplate(DEFAULT_DOCUMENT_SMS_TEMPLATE, docVars);

    const todayStr = new Date().toISOString().split('T')[0];
    const dispatchedChannels: string[] = [];

    // Dispatch SMS if enabled on document and settings has phone
    if (doc.notify_sms && recipientPhone) {
      const smsRes = await sendHttpSms({
        to: recipientPhone,
        message: smsBody,
        customApiKey: settings?.httpsms_api_key,
        customFrom: settings?.httpsms_from_number,
      });

      await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        channel: 'sms',
        recipient: recipientPhone,
        document_id: doc.id,
        message_body: smsBody,
        status: smsRes.status,
        error_message: smsRes.error || null,
        sent_date: todayStr,
      });

      if (smsRes.success) {
        dispatchedChannels.push(`SMS to ${recipientPhone} (${smsRes.status})`);
      }
    }

    // Dispatch Email if enabled on document and settings has email
    if (doc.notify_email && recipientEmail) {
      const emailRes = await sendGmailEmail({
        to: recipientEmail,
        subject: emailSubject,
        text: emailBody,
        customUser: settings?.smtp_email,
        customPass: settings?.smtp_app_password,
      });

      await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
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
        dispatchedChannels.push(`Email to ${recipientEmail} (${emailRes.status})`);
      }
    }

    // Update last_notified_at
    await supabase
      .from('bili_property_documents')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', doc.id);

    if (dispatchedChannels.length === 0) {
      return {
        success: false,
        error:
          'No notification channels active. Please ensure Email or SMS is checked on the document and configured in Settings.',
      };
    }

    revalidatePath(`/dashboard/properties/${doc.property_id}`);

    return {
      success: true,
      message: `Alert dispatched successfully via ${dispatchedChannels.join(' & ')}!`,
      channels: dispatchedChannels,
    };
  } catch (err: any) {
    console.error('Error in sendDocumentExpiryAlertAction:', err);
    return { success: false, error: err.message };
  }
}
