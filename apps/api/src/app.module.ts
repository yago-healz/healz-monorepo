import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { MailModule } from "./mail/mail.module";
import { SignupModule } from "./signup/signup.module";
import { InvitesModule } from "./invites/invites.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ClinicsModule } from "./clinics/clinics.module";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module";
import { EventSourcingModule } from "./event-sourcing/event-sourcing.module";
import { PatientModule } from "./patient/patient.module";
import { MessagingModule } from "./messaging/messaging.module";
import { RlsMiddleware } from "./db/middleware";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "apps/api/.env",
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get("NODE_ENV") !== "production";
        if (isDev) {
          // Em dev, limites muito altos (basicamente desabilitado)
          return [{ ttl: 1000, limit: 1000 }];
        }
        return [
          { name: "short", ttl: 1000, limit: 3 },
          { name: "medium", ttl: 60000, limit: 60 },
        ];
      },
    }),
    AuthModule,
    AuditModule,
    EventSourcingModule,
    PatientModule,
    MessagingModule,
    MailModule,
    SignupModule,
    InvitesModule,
    OrganizationsModule,
    ClinicsModule,
    PlatformAdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RLS middleware to all routes except auth, signup and invite accept endpoints
    // This ensures the organization context is set before any database queries
    consumer
      .apply(RlsMiddleware)
      .exclude("api/v1/auth/*path", "api/v1/signup/*path", "api/v1/invites/accept")
      .forRoutes("*");
  }
}
