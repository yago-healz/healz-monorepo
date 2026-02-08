/**
 * Setup global para testes E2E
 * Executado uma vez antes de todos os testes
 */

import { execSync } from 'child_process';
import postgres from 'postgres';

export default async () => {
  console.log('\n🚀 Starting E2E tests...\n');

  try {
    // Verifica se o banco de teste está rodando
    console.log('📦 Checking test database connection...');
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in .env.test');
    }

    // Tenta conectar ao banco
    const client = postgres(connectionString, { max: 1 });

    try {
      await client`SELECT 1`;
      console.log('✅ Test database is connected');
    } catch (error) {
      console.error('❌ Test database is not running!');
      console.log('💡 Run: pnpm test:db:up');
      throw error;
    }

    // Executa as migrações/push do schema
    console.log('🔄 Pushing database schema...');
    execSync('pnpm db:push', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✅ Database schema is ready\n');

    await client.end();
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
};
