import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

export class TestFixtures {
  // Default fixtures
  static readonly PLATFORM_ADMIN = {
    email: 'admin@healz.com',
    password: 'Admin123!@#',
    name: 'Platform Admin',
  };

  static readonly ORG_ADMIN = {
    email: 'orgadmin@test.com',
    password: 'OrgAdmin123!@#',
    name: 'Organization Admin',
  };

  static readonly DOCTOR = {
    email: 'doctor@test.com',
    password: 'Doctor123!@#',
    name: 'Dr. John Doe',
  };

  static readonly SECRETARY = {
    email: 'secretary@test.com',
    password: 'Secretary123!@#',
    name: 'Jane Secretary',
  };

  static readonly ORGANIZATION = {
    name: 'Test Organization',
    slug: 'test-org',
  };

  static readonly CLINIC = {
    name: 'Test Clinic',
    address: '123 Test St',
    city: 'Test City',
  };

  constructor(private dataSource: DataSource) {}

  /**
   * Cria uma organização de teste
   */
  async createOrganization(data?: Partial<typeof TestFixtures.ORGANIZATION>) {
    const orgData = { ...TestFixtures.ORGANIZATION, ...data };
    const [org] = await this.dataSource.query(
      `INSERT INTO organizations (id, name, slug, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [nanoid(), orgData.name, orgData.slug, 'active'],
    );
    return org;
  }

  /**
   * Cria uma clínica de teste
   */
  async createClinic(organizationId: string, data?: Partial<typeof TestFixtures.CLINIC>) {
    const clinicData = { ...TestFixtures.CLINIC, ...data };
    const [clinic] = await this.dataSource.query(
      `INSERT INTO clinics (id, name, "organizationId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [nanoid(), clinicData.name, organizationId, 'active'],
    );
    return clinic;
  }

  /**
   * Cria um usuário de teste
   */
  async createUser(
    data: Partial<typeof TestFixtures.DOCTOR> & { email: string; password: string },
  ) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await this.dataSource.query(
      `INSERT INTO users (id, email, "passwordHash", name, "emailVerified", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [nanoid(), data.email, passwordHash, data.name || 'Test User', true, 'active'],
    );
    return user;
  }

  /**
   * Cria uma relação usuário-clínica
   */
  async createUserClinic(userId: string, clinicId: string, role: string = 'admin') {
    const [userClinic] = await this.dataSource.query(
      `INSERT INTO user_clinics ("userId", "clinicId", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [userId, clinicId, role],
    );
    return userClinic;
  }

  /**
   * Cria um platform admin
   */
  async createPlatformAdmin(
    data: Partial<typeof TestFixtures.PLATFORM_ADMIN> = TestFixtures.PLATFORM_ADMIN,
  ) {
    const user = await this.createUser(data as any);
    await this.dataSource.query(
      `INSERT INTO platform_admins ("userId", "createdAt", "updatedAt")
       VALUES ($1, NOW(), NOW())`,
      [user.id],
    );
    return user;
  }

  /**
   * Cria setup completo: org + clinic + admin
   */
  async createCompleteSetup() {
    const org = await this.createOrganization();
    const clinic = await this.createClinic(org.id);
    const admin = await this.createUser(TestFixtures.ORG_ADMIN);
    await this.createUserClinic(admin.id, clinic.id, 'admin');

    return { org, clinic, admin };
  }
}
