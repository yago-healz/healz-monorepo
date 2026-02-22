import { Injectable } from "@nestjs/common";
import { db } from "../database";
import { auditLogs } from "../database/schema";

export interface AuditEntry {
  userId?: string;
  organizationId?: string;
  clinicId?: string;
  action: string;
  resource: string;
  method: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  /**
   * Fire-and-forget logging method.
   * Logs audit entries without blocking the request.
   * Failures are logged but don't throw.
   */
  log(entry: AuditEntry): Promise<void> {
    // Convert undefined or empty string to null for Platform Admins
    const normalizedEntry = {
      ...entry,
      organizationId: entry.organizationId || null,
      clinicId: entry.clinicId || null,
    };

    // Fire-and-forget: don't await, don't throw
    db.insert(auditLogs)
      .values(normalizedEntry)
      .catch((err) => {
        console.error("[AuditService] Failed to log audit entry:", {
          error: err.message,
          entry: normalizedEntry,
        });
      });

    // Return resolved promise immediately
    return Promise.resolve();
  }
}
