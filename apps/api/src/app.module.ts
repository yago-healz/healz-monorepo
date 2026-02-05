import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ClinicsModule } from './clinics/clinics.module';
import { MembersModule } from './members/members.module';
import { ContextModule } from './context/context.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    OrganizationsModule,
    ClinicsModule,
    MembersModule,
    ContextModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
