import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { AuditService } from "./audit.service";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get user from JWT payload (set by guard)
    const user = request.user as JwtPayload | undefined;

    // Skip logging for unauthenticated requests
    if (!user) {
      return next.handle();
    }

    // Log after response
    return next.handle().pipe(
      tap(() => {
        // Map HTTP method to audit action
        const methodMap: Record<string, string> = {
          GET: "READ",
          POST: "CREATE",
          PUT: "UPDATE",
          PATCH: "UPDATE",
          DELETE: "DELETE",
        };

        const action = methodMap[request.method] || request.method;

        this.auditService.log({
          userId: user.userId,
          organizationId: user.organizationId,
          clinicId: user.activeClinicId,
          action,
          resource: request.originalUrl,
          method: request.method,
          statusCode: response.statusCode,
          ip: request.ip,
          userAgent: request.get("user-agent"),
        });
      }),
    );
  }
}
