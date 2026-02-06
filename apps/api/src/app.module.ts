import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ClinicsModule } from "./clinics/clinics.module";
import { ContextModule } from "./context/context.module";
import { RlsMiddleware } from "./db/middleware";
import { HealthController } from "./health.controller";
import { MembersModule } from "./members/members.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "apps/api/.env",
    }),
    AuthModule,
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
    consumer.apply(RlsMiddleware).exclude("api/auth/(.*)").forRoutes("*");
  }
}
