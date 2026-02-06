import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { auth } from './auth/auth';

const OPENAPI_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

const prefixAuthOpenApi = (openApi: any, prefix: string) => {
  const cloned = JSON.parse(
    JSON.stringify(openApi).replaceAll(
      '#/components/schemas/',
      `#/components/schemas/${prefix}`,
    ),
  );

  if (cloned?.components?.schemas) {
    cloned.components.schemas = Object.fromEntries(
      Object.entries(cloned.components.schemas).map(([key, value]) => [
        `${prefix}${key}`,
        value,
      ]),
    );
  }

  if (cloned?.tags) {
    cloned.tags = cloned.tags.map((tag: any) => ({
      ...tag,
      name: `${prefix}${tag.name}`,
    }));
  }

  if (cloned?.paths) {
    Object.values(cloned.paths).forEach((pathItem: any) => {
      OPENAPI_METHODS.forEach((method) => {
        const operation = pathItem?.[method];
        if (operation?.tags) {
          operation.tags = operation.tags.map((tag: string) => `${prefix}${tag}`);
        }
      });
    });
  }

  return cloned;
};

const mergeOpenApiDocs = (baseDoc: any, authDoc: any) => {
  return {
    ...baseDoc,
    paths: {
      ...(baseDoc?.paths || {}),
      ...(authDoc?.paths || {}),
    },
    components: {
      ...(baseDoc?.components || {}),
      schemas: {
        ...(baseDoc?.components?.schemas || {}),
        ...(authDoc?.components?.schemas || {}),
      },
      securitySchemes: {
        ...(baseDoc?.components?.securitySchemes || {}),
        ...(authDoc?.components?.securitySchemes || {}),
      },
    },
    tags: [...(baseDoc?.tags || []), ...(authDoc?.tags || [])],
  };
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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
  const authOpenApiRaw = await auth.api.generateOpenAPISchema();
  const authOpenApi = prefixAuthOpenApi(authOpenApiRaw, 'BetterAuth_');
  const mergedDocument = mergeOpenApiDocs(document, authOpenApi);
  SwaggerModule.setup('api/docs', app, mergedDocument, {
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
