import { Pool } from 'pg';

const TABLES_TO_TRUNCATE = [
  'audit_logs',
  'refresh_tokens',
  'user_clinic_roles',
  'platform_admins',
  'invites',
  'clinics',
  'organizations',
  'users',
];

export class TestDatabaseHelper {
  constructor(private readonly pool: Pool) {}

  /**
   * Limpa todas as tabelas do banco de dados entre os testes
   */
  async cleanDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
