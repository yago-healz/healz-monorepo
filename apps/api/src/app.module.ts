import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
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
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RLS middleware to all routes except auth endpoints
    // This ensures the organization context is set before any database queries
    consumer.apply(RlsMiddleware).exclude("api/auth/(.*)").forRoutes("*");
  }
}
