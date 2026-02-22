import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppointmentModule } from "./modules/appointment/appointment.module";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { AuditModule } from "./infrastructure/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CarolModule } from "./modules/carol/carol.module";
import { ClinicSettingsModule } from "./modules/clinic-settings/clinic-settings.module";
import { ClinicsModule } from "./modules/clinics/clinics.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { RlsMiddleware } from "./infrastructure/database/middleware";
import { EventSourcingModule } from "./infrastructure/event-sourcing/event-sourcing.module";
import { HealthController } from "./health.controller";
import { InvitesModule } from "./modules/invites/invites.module";
import { MailModule } from "./infrastructure/mail/mail.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PatientJourneyModule } from "./modules/patient-journey/patient-journey.module";
import { PatientModule } from "./modules/patient/patient.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
import { SignupModule } from "./modules/signup/signup.module";

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
