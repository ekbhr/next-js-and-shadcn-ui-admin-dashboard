/**
 * Notifications Module
 * 
 * Handles sending notifications for various system events:
 * - Cron sync failures
 * - Revenue alerts
 * - System health issues
 */

import { sendEmail } from "./email";
import { prisma } from "./prisma";

// Admin email for system notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shahfaisal106@gmail.com";

// Notification types
export type NotificationType = 
  | "sync_failed"
  | "sync_partial"
  | "sync_success"
  | "revenue_alert"
  | "system_error";

interface SyncResult {
  network: string;
  success: boolean;
  saved?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  timestamp?: Date;
}

/**
 * Send notification for sync failure
 */
export async function notifySyncFailure(
  network: string,
  error: string,
  details?: {
    timestamp?: Date;
    userId?: string;
    additionalInfo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const timestamp = details?.timestamp || new Date();
  
  const subject = `⚠️ [RevEngine] ${network} Sync Failed`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; color: #DC2626;">Sync Failed: ${network}</h2>
        <p style="margin: 0; color: #7F1D1D;">The automated sync encountered an error.</p>
      </div>
      
      <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: #374151;">Error Details</h3>
        <p style="margin: 0; color: #6B7280; font-family: monospace; white-space: pre-wrap;">${escapeHtml(error)}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Network</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; font-weight: bold;">${network}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Timestamp</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${timestamp.toISOString()}</td>
        </tr>
        ${details?.userId ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">User ID</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${details.userId}</td>
        </tr>
        ` : ''}
        ${details?.additionalInfo ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Additional Info</td>
          <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${escapeHtml(details.additionalInfo)}</td>
        </tr>
        ` : ''}
      </table>
      
      <div style="background: #FEF3C7; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400E; font-size: 14px;">
          <strong>Action Required:</strong> Please check the server logs and resolve the issue. 
          The sync will retry automatically on the next scheduled run.
        </p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        This is an automated notification from RevEngine Media reporting system.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    
    console.log(`[Notifications] Sync failure alert sent for ${network}`);
    return { success: true };
  } catch (error) {
    console.error(`[Notifications] Failed to send sync failure alert:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send notification" 
    };
  }
}

/**
 * Send notification for partial sync (some networks succeeded, some failed)
 */
export async function notifyPartialSync(
  results: SyncResult[]
): Promise<{ success: boolean; error?: string }> {
  const failed = results.filter(r => !r.success);
  const succeeded = results.filter(r => r.success);
  
  if (failed.length === 0) return { success: true }; // All succeeded, no need to notify
  
  const subject = `⚠️ [RevEngine] Partial Sync - ${failed.length} network(s) failed`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; color: #B45309;">Partial Sync Complete</h2>
        <p style="margin: 0; color: #92400E;">Some networks synced successfully, but others encountered errors.</p>
      </div>
      
      <h3 style="color: #374151; margin-bottom: 12px;">Summary</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #F3F4F6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E5E7EB;">Network</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E5E7EB;">Status</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E5E7EB;">Records</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: bold;">${r.network}</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
                ${r.success 
                  ? '<span style="color: #059669;">✓ Success</span>' 
                  : '<span style="color: #DC2626;">✗ Failed</span>'}
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
                ${r.success ? `${r.saved || 0} saved, ${r.updated || 0} updated` : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${failed.length > 0 ? `
        <h3 style="color: #DC2626; margin-bottom: 12px;">Errors</h3>
        ${failed.map(f => `
          <div style="background: #FEE2E2; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <strong style="color: #991B1B;">${f.network}:</strong>
            <p style="margin: 8px 0 0 0; color: #7F1D1D; font-family: monospace; font-size: 13px;">
              ${(f.errors || ['Unknown error']).map(e => escapeHtml(e)).join('<br>')}
            </p>
          </div>
        `).join('')}
      ` : ''}
      
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        This is an automated notification from RevEngine Media reporting system.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    
    console.log(`[Notifications] Partial sync alert sent`);
    return { success: true };
  } catch (error) {
    console.error(`[Notifications] Failed to send partial sync alert:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send notification" 
    };
  }
}

/**
 * Send daily sync summary (optional, for admins who want daily updates)
 */
export async function notifySyncSummary(
  results: SyncResult[]
): Promise<{ success: boolean; error?: string }> {
  const allSucceeded = results.every(r => r.success);
  const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
  
  const subject = allSucceeded 
    ? `✓ [RevEngine] Daily Sync Complete - ${totalSaved + totalUpdated} records`
    : `⚠️ [RevEngine] Daily Sync Complete with Errors`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${allSucceeded ? '#D1FAE5' : '#FEF3C7'}; border-left: 4px solid ${allSucceeded ? '#059669' : '#F59E0B'}; padding: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; color: ${allSucceeded ? '#065F46' : '#B45309'};">
          Daily Sync ${allSucceeded ? 'Successful' : 'Complete with Issues'}
        </h2>
        <p style="margin: 0; color: ${allSucceeded ? '#047857' : '#92400E'};">
          ${totalSaved} new records saved, ${totalUpdated} records updated.
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #F3F4F6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #E5E7EB;">Network</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #E5E7EB;">Status</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #E5E7EB;">Saved</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #E5E7EB;">Updated</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${r.network}</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
                ${r.success 
                  ? '<span style="color: #059669;">✓</span>' 
                  : '<span style="color: #DC2626;">✗</span>'}
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${r.saved || 0}</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${r.updated || 0}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #F9FAFB; font-weight: bold;">
            <td style="padding: 12px;">Total</td>
            <td style="padding: 12px;"></td>
            <td style="padding: 12px; text-align: right;">${totalSaved}</td>
            <td style="padding: 12px; text-align: right;">${totalUpdated}</td>
          </tr>
        </tfoot>
      </table>
      
      <p style="color: #9CA3AF; font-size: 12px;">
        Timestamp: ${new Date().toISOString()}<br>
        This is an automated notification from RevEngine Media reporting system.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    
    console.log(`[Notifications] Daily sync summary sent`);
    return { success: true };
  } catch (error) {
    console.error(`[Notifications] Failed to send sync summary:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send notification" 
    };
  }
}

/**
 * Get admin users for notifications
 */
export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  
  return admins.map(a => a.email).filter((e): e is string => !!e);
}

/**
 * Escape HTML to prevent XSS in emails
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

