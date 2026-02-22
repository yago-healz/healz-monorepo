import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TestDatabaseHelper } from './test-database.helper';
import { TestFixtures } from './test-fixtures.helper';
import { MailService } from '../../src/infrastructure/mail/mail.service';
import {
  MailServiceMock,
  createMailServiceMock,
} from './mocks/mail-service.mock';

export interface E2eTestContext {
  app: INestApplication;
  pool: Pool;
  dbHelper: TestDatabaseHelper;
  fixtures: TestFixtures;
  mailServiceMock: MailServiceMock;
}

export async function createE2eTestContext(): Promise<E2eTestContext> {
  const mailServiceMock = createMailServiceMock();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(mailServiceMock)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(cookieParser());
  await app.init();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const dbHelper = new TestDatabaseHelper(pool);
  const fixtures = new TestFixtures(pool);

  return { app, pool, dbHelper, fixtures, mailServiceMock };
}

export async function closeE2eTestContext(context: E2eTestContext) {
  await context.app.close();
  await context.pool.end();
}
