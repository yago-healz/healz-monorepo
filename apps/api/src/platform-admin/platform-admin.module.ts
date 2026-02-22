import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuditModule } from "../infrastructure/audit/audit.module";
import { MailModule } from "../infrastructure/mail/mail.module";
import { InvitesModule } from "../invites/invites.module";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformAdminOrganizationsService } from "./services/platform-admin-organizations.service";
import { PlatformAdminClinicsService } from "./services/platform-admin-clinics.service";
import { PlatformAdminUsersService } from "./services/platform-admin-users.service";
import { PlatformAdminImpersonationService } from "./services/platform-admin-impersonation.service";
import { PlatformAdminAdminsService } from "./services/platform-admin-admins.service";
import { PlatformAdminOrganizationsController } from "./controllers/platform-admin-organizations.controller";
import { PlatformAdminClinicsController } from "./controllers/platform-admin-clinics.controller";
import { PlatformAdminUsersController } from "./controllers/platform-admin-users.controller";
import { PlatformAdminSupportController } from "./controllers/platform-admin-support.controller";
import { PlatformAdminAdminsController } from "./controllers/platform-admin-admins.controller";

@Module({
  imports: [
    AuditModule,
    MailModule,
    InvitesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { issuer: "healz-platform" },
      }),
    }),
  ],
  controllers: [
    PlatformAdminOrganizationsController,
    PlatformAdminClinicsController,
    PlatformAdminUsersController,
    PlatformAdminSupportController,
    PlatformAdminAdminsController,
  ],
  providers: [
    PlatformAdminGuard,
    PlatformAdminOrganizationsService,
    PlatformAdminClinicsService,
    PlatformAdminUsersService,
    PlatformAdminImpersonationService,
    PlatformAdminAdminsService,
  ],
  exports: [PlatformAdminGuard],
})
export class PlatformAdminModule {}
