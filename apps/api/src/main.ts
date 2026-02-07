import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.setGlobalPrefix("api/v1");

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle("Healz API")
    .setDescription(
      "Multi-tenant healthcare management system API with role-based access control",
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Enter your Bearer token",
        in: "header",
      },
      "bearer",
    )
    .addTag("Health", "Health check endpoints")
    .addTag("Authentication", "Authentication and session management")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/docs", app, document, {
    customSiteTitle: "Healz API Documentation",
    customfavIcon: "https://nestjs.com/img/logo-small.svg",
    customCss: ".swagger-ui .topbar { display: none }",
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api/v1/docs`,
  );
}

bootstrap();
