import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export type AuditAction = 'INSERT' | 'UPDATE' | 'SOFT_DELETE' | 'HARD_DELETE' | 'RESTORE';
export type AuditEntity =
  | 'transaction'
  | 'savings'
  | 'loan'
  | 'property'
  | 'liability'
  | 'credit_card';

export interface AuditLogParams {
  websiteId?: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
}

export async function logAuditEntry(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('bili_audit_logs').insert({
      website_id: params.websiteId || WEBSITE_ID,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    // Non-blocking: Fail-open for user flow, but log error
    console.error('Failed to write audit log entry:', err);
  }
}
