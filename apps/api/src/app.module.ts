import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ClinicsModule } from './clinics/clinics.module';
import { MembersModule } from './members/members.module';
import { ContextModule } from './context/context.module';
import { RlsMiddleware } from './db/middleware';

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RLS middleware to all routes except auth endpoints
    // This ensures the organization context is set before any database queries
    consumer
      .apply(RlsMiddleware)
      .exclude('api/auth/(.*)')
      .forRoutes('*');
  }
}
