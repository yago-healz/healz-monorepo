import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppointmentModule } from "./appointment/appointment.module";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { AuditModule } from "./infrastructure/audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CarolModule } from "./carol/carol.module";
import { ClinicSettingsModule } from "./clinic-settings/clinic-settings.module";
import { ClinicsModule } from "./clinics/clinics.module";
import { ConversationModule } from "./conversation/conversation.module";
import { RlsMiddleware } from "./infrastructure/database/middleware";
import { EventSourcingModule } from "./infrastructure/event-sourcing/event-sourcing.module";
import { HealthController } from "./health.controller";
import { InvitesModule } from "./invites/invites.module";
import { MailModule } from "./infrastructure/mail/mail.module";
import { MessagingModule } from "./messaging/messaging.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PatientJourneyModule } from "./patient-journey/patient-journey.module";
import { PatientModule } from "./patient/patient.module";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module";
import { SignupModule } from "./signup/signup.module";

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
    CarolModule,
    ConversationModule,
    AppointmentModule,
    PatientJourneyModule,
    MailModule,
    SignupModule,
    InvitesModule,
    OrganizationsModule,
    ClinicsModule,
    ClinicSettingsModule,
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
      .exclude(
        "api/v1/auth/*path",
        "api/v1/signup/*path",
        "api/v1/invites/accept",
      )
      .forRoutes("*");
  }
}
