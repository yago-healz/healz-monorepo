import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { db } from '../connection';
import { sql } from 'drizzle-orm';

/**
 * RLS Middleware - Sets the current organization context for Row-Level Security
 *
 * This middleware extracts the active organization ID from the user's session
 * and sets it as a PostgreSQL session variable. This enables Row-Level Security
 * policies to automatically filter data based on the user's current organization.
 */
@Injectable()
export class RlsMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Extract session from request (set by AuthGuard)
    const session = (req as any).session;

    // If user has an active organization, set it in the database session context
    if (session?.activeOrganizationId) {
      try {
        await db.execute(
          sql`SELECT set_config('app.current_org_id', ${session.activeOrganizationId}, true)`
        );
      } catch (error) {
        console.error('Failed to set RLS context:', error);
        // Continue request even if RLS context fails
        // This allows the request to proceed, but queries will return empty results
      }
    }

    next();
  }
}
