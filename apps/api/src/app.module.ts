import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { RlsMiddleware } from "./db/middleware";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "apps/api/.env",
    }),
    AuthModule,
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
