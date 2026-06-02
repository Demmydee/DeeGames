import { supabase } from '../config/supabase';

export interface AuditLogPayload {
  adminUserId: string;
  adminEmail: string;
  actionType: string;
  resourceType: string;
  resourceId?: string | null;
  description: string;
  beforeValue?: any;
  afterValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AdminAuditService {
  static async log(payload: AuditLogPayload) {
    try {
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: payload.adminUserId,
          admin_email: payload.adminEmail,
          action_type: payload.actionType,
          resource_type: payload.resourceType,
          resource_id: payload.resourceId || null,
          description: payload.description,
          before_value: payload.beforeValue || null,
          after_value: payload.afterValue || null,
          ip_address: payload.ipAddress || null,
          user_agent: payload.userAgent || null
        });

      if (error) {
        console.error('[AdminAuditService] Error saving audit log:', error);
      }
    } catch (err) {
      console.error('[AdminAuditService] Failed to execute administrative audit logging:', err);
    }
  }
}
