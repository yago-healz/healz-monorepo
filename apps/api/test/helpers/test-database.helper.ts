import { DataSource } from 'typeorm';

export class TestDatabaseHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Limpa todas as tabelas do banco de dados
   */
  async cleanDatabase(): Promise<void> {
    const tables = [
      'platform_admins',
      'audit_logs',
      'refresh_tokens',
      'user_clinics',
      'clinics',
      'organizations',
      'users',
    ];

    for (const table of tables) {
      await this.dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }

  /**
   * Reseta as sequences do banco
   */
  async resetSequences(): Promise<void> {
    const sequences = await this.dataSource.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    for (const { sequence_name } of sequences) {
      await this.dataSource.query(`ALTER SEQUENCE ${sequence_name} RESTART WITH 1`);
    }
  }

  /**
   * Executa seed de dados de teste
   */
  async seedTestData(): Promise<void> {
    // Implementar seeds conforme necessário
  }
}
