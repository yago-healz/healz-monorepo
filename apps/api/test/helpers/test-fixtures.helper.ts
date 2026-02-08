import { randomBytes, randomUUID } from 'crypto';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

interface CreateUserOptions {
  email: string;
  password: string;
  name?: string;
  emailVerified?: boolean;
  status?: string;
  emailVerificationToken?: string | null;
  emailVerificationExpiry?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiry?: Date | null;
}

interface OrganizationFixture {
  name?: string;
  slug?: string;
  status?: 'active' | 'inactive';
}

interface ClinicFixture {
  name?: string;
  status?: 'active' | 'inactive';
}

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
  };

  constructor(private readonly pool: Pool) {}

  /**
   * Cria uma organização de teste
   */
  async createOrganization(data?: OrganizationFixture) {
    const base = { ...TestFixtures.ORGANIZATION, ...data };
    const id = randomUUID();
    const slug =
      data?.slug ?? `${TestFixtures.ORGANIZATION.slug ?? 'test-org'}-${randomBytes(3).toString('hex')}`;
    const status = base.status ?? 'active';

    const result = await this.pool.query(
      `INSERT INTO organizations (id, name, slug, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, status`,
      [id, base.name ?? TestFixtures.ORGANIZATION.name, slug, status],
    );

    const row = result.rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      status: row.status as string,
    };
  }

  /**
   * Cria uma clínica de teste
   */
  async createClinic(organizationId: string, data?: ClinicFixture) {
    const base = { ...TestFixtures.CLINIC, ...data };
    const id = randomUUID();
    const status = base.status ?? 'active';

    const result = await this.pool.query(
      `INSERT INTO clinics (id, organization_id, name, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, organization_id, name, status`,
      [id, organizationId, base.name ?? TestFixtures.CLINIC.name, status],
    );

    const row = result.rows[0];
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      name: row.name as string,
      status: row.status as string,
    };
  }

  /**
   * Cria um usuário de teste
   */
  async createUser(data: CreateUserOptions) {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await this.pool.query(
      `INSERT INTO users (
         id,
         email,
         password_hash,
         name,
         email_verified,
         status,
         email_verification_token,
         email_verification_expiry,
         reset_password_token,
         reset_password_expiry
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING
         id,
         email,
         name,
         email_verified,
         status,
         password_hash,
         email_verification_token,
         email_verification_expiry,
         reset_password_token,
         reset_password_expiry`,
      [
        id,
        data.email,
        passwordHash,
        data.name ?? 'Test User',
        data.emailVerified ?? true,
        data.status ?? 'active',
        data.emailVerificationToken ?? null,
        data.emailVerificationExpiry ?? null,
        data.resetPasswordToken ?? null,
        data.resetPasswordExpiry ?? null,
      ],
    );

    const row = result.rows[0];
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      passwordHash: row.password_hash as string,
      emailVerified: row.email_verified as boolean,
      status: row.status as string,
      emailVerificationToken: row.email_verification_token as string | null,
      emailVerificationExpiry: row.email_verification_expiry as Date | null,
      resetPasswordToken: row.reset_password_token as string | null,
      resetPasswordExpiry: row.reset_password_expiry as Date | null,
    };
  }

  /**
   * Cria uma relação usuário-clínica
   */
  async createUserClinic(userId: string, clinicId: string, role: string = 'admin') {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO user_clinic_roles (id, user_id, clinic_id, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, clinic_id, role`,
      [id, userId, clinicId, role],
    );

    const row = result.rows[0];
    return {
      id: row.id as string,
      userId: row.user_id as string,
      clinicId: row.clinic_id as string,
      role: row.role as string,
    };
  }

  /**
   * Cria um platform admin
   */
  async createPlatformAdmin(
    data: Partial<typeof TestFixtures.PLATFORM_ADMIN> = TestFixtures.PLATFORM_ADMIN,
  ) {
    const user = await this.createUser({
      email: data.email ?? TestFixtures.PLATFORM_ADMIN.email,
      password: data.password ?? TestFixtures.PLATFORM_ADMIN.password,
      name: data.name ?? TestFixtures.PLATFORM_ADMIN.name,
      emailVerified: true,
    });

    await this.pool.query(
      `INSERT INTO platform_admins (id, user_id, created_at)
       VALUES ($1, $2, NOW())`,
      [randomUUID(), user.id],
    );

    return user;
  }

  /**
   * Cria setup completo: org + clinic + admin
   */
  async createCompleteSetup() {
    const org = await this.createOrganization();
    const clinic = await this.createClinic(org.id);
    const admin = await this.createUser({
      email: TestFixtures.ORG_ADMIN.email,
      password: TestFixtures.ORG_ADMIN.password,
      name: TestFixtures.ORG_ADMIN.name,
    });
    await this.createUserClinic(admin.id, clinic.id, 'admin');

    return { org, clinic, admin };
  }
}
