import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export class TestAuthHelper {
  /**
   * Realiza login e retorna tokens
   */
  static async login(
    app: INestApplication,
    email: string,
    password: string,
    clinicId?: string,
  ): Promise<LoginResult> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password, clinicId })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    const refreshToken = cookies
      ? cookies[0].split(';')[0].split('=')[1]
      : '';

    return {
      accessToken: response.body.accessToken,
      refreshToken,
      user: response.body.user,
    };
  }

  /**
   * Cria um usuário e faz login automaticamente
   */
  static async createUserAndLogin(
    app: INestApplication,
    userData: {
      email: string;
      password: string;
      name: string;
      organizationId?: string;
      clinicId?: string;
      role?: string;
    },
  ): Promise<LoginResult> {
    // Implementar criação de usuário no banco
    // Depois fazer login
    return this.login(app, userData.email, userData.password);
  }

  /**
   * Cria um platform admin e faz login
   */
  static async createPlatformAdminAndLogin(
    app: INestApplication,
    email: string = 'admin@healz.com',
    password: string = 'Admin123!@#',
  ): Promise<LoginResult> {
    // Implementar criação de platform admin
    return this.login(app, email, password);
  }

  /**
   * Cria um admin de organização e faz login
   */
  static async createOrgAdminAndLogin(
    app: INestApplication,
    organizationId: string,
  ): Promise<LoginResult> {
    // Implementar
    return {} as LoginResult;
  }

  /**
   * Cria header de autenticação
   */
  static authHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
