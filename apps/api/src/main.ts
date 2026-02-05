import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Healz API')
    .setDescription('Multi-tenant healthcare management system API with role-based access control')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer token',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Authentication', 'Authentication and session management')
    .addTag('Organizations', 'Organization management endpoints')
    .addTag('Clinics', 'Clinic management endpoints')
    .addTag('Members', 'Organization member management endpoints')
    .addTag('Context', 'User context and multi-tenant switching')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Healz API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
