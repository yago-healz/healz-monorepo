import { Injectable } from "@nestjs/common";
import { db } from "../db";
import { auditLogs } from "../db/schema";

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
    // Fire-and-forget: don't await, don't throw
    db.insert(auditLogs)
      .values(entry)
      .catch((err) => {
        console.error("[AuditService] Failed to log audit entry:", {
          error: err.message,
          entry,
        });
      });

    // Return resolved promise immediately
    return Promise.resolve();
  }
}
