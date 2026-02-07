import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não decoradas
      forbidNonWhitelisted: true, // Retorna erro se propriedades extras forem enviadas
      transform: true, // Transforma automaticamente payloads em DTOs
      transformOptions: {
        enableImplicitConversion: true, // Converte tipos automaticamente
      },
    }),
  );

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
      `Multi-tenant healthcare management system API with role-based access control.

**Features:**
- 🔐 JWT Authentication with Refresh Token Rotation
- 🏢 Multi-tenant architecture (Organizations → Clinics → Users)
- 👥 Role-based access control (Admin, Doctor, Secretary)
- 📧 Email verification and password reset
- 🔄 Context switching between clinics
- 🛡️ Rate limiting and security best practices
- 📝 Comprehensive audit logging

**Base URL:** \`/api/v1\`

**Authentication:**
Most endpoints require a Bearer token. After login, include the token in the Authorization header:
\`Authorization: Bearer <your-token>\`

**Getting Started:**
1. Create an organization: \`POST /signup\`
2. Login: \`POST /auth/login\`
3. Use the access token for authenticated requests`,
    )
    .setVersion("1.0.0")
    .setContact(
      "Healz Support",
      "https://healz.com",
      "support@healz.com",
    )
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Enter your Bearer token (without 'Bearer ' prefix)",
        in: "header",
      },
      "bearer",
    )
    .addCookieAuth("refreshToken", {
      type: "apiKey",
      in: "cookie",
      name: "refreshToken",
      description: "Refresh token stored in httpOnly cookie (automatically sent by browser)",
    })
    .addTag("Health", "Health check endpoints for monitoring API status")
    .addTag("Authentication", "Authentication and session management (login, logout, refresh, password reset)")
    .addTag("Signup", "Organization and user registration endpoints")
    .addTag("Invites", "User invitation management (send and accept invites)")
    .addTag("Organizations", "Organization management (create clinics)")
    .addTag("Clinics", "Clinic management (add members, manage staff)")
    .addServer("http://localhost:3001", "Development server")
    .addServer("https://api.healz.com", "Production server")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup("api/v1/docs", app, document, {
    customSiteTitle: "Healz API Documentation",
    customfavIcon: "https://nestjs.com/img/logo-small.svg",
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 36px; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 15px; }
    `,
    swaggerOptions: {
      persistAuthorization: true, // Mantém token entre reloads
      docExpansion: "none", // Colapsa todas as seções por padrão
      filter: true, // Habilita busca
      showRequestDuration: true, // Mostra duração das requests
      syntaxHighlight: {
        activate: true,
        theme: "monokai",
      },
      tryItOutEnabled: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api/v1/docs`,
  );
}

bootstrap();
