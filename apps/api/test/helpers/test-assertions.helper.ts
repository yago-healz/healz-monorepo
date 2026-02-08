export class TestAssertions {
  /**
   * Verifica estrutura de resposta de lista paginada
   */
  static assertPaginatedResponse(body: any) {
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
  }

  /**
   * Verifica estrutura de user object
   */
  static assertUserStructure(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('emailVerified');
    expect(user).not.toHaveProperty('passwordHash');
  }

  /**
   * Verifica estrutura de organization object
   */
  static assertOrganizationStructure(org: any) {
    expect(org).toHaveProperty('id');
    expect(org).toHaveProperty('name');
    expect(org).toHaveProperty('slug');
    expect(org).toHaveProperty('status');
  }

  /**
   * Verifica estrutura de clinic object
   */
  static assertClinicStructure(clinic: any) {
    expect(clinic).toHaveProperty('id');
    expect(clinic).toHaveProperty('name');
    expect(clinic).toHaveProperty('organizationId');
    expect(clinic).toHaveProperty('status');
  }

  /**
   * Verifica erro de validação
   */
  static assertValidationError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(400);
    expect(body).toHaveProperty('message');
  }

  /**
   * Verifica erro de autenticação
   */
  static assertUnauthorizedError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(401);
  }

  /**
   * Verifica erro de permissão
   */
  static assertForbiddenError(body: any) {
    expect(body).toHaveProperty('statusCode');
    expect(body.statusCode).toBe(403);
  }
}
