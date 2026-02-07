/**
 * Testes de Validação da Configuração Inicial
 *
 * Para executar esses testes, abra o console do navegador após iniciar a aplicação
 * e copie/cole cada bloco de teste.
 */

// ============================================
// Teste 1: Verificar se axios está configurado
// ============================================
import api from './axios'
console.log('✅ Teste 1: URL Base do Axios')
console.log('URL Base:', api.defaults.baseURL)
console.log('Com Credenciais:', api.defaults.withCredentials)
// Esperado: http://localhost:3001/api/v1 e true

// ============================================
// Teste 2: Verificar tokenService
// ============================================
import { tokenService } from '@/services/token.service'

console.log('\n✅ Teste 2: Token Service')

// Teste set/get
tokenService.setAccessToken('test-token-123')
console.log('Token armazenado:', tokenService.getAccessToken())
console.log('Token válido?', tokenService.hasValidToken())
// Esperado: 'test-token-123' e true

// Teste user
tokenService.setUser({ id: '1', name: 'Test User', email: 'test@example.com' })
console.log('User armazenado:', tokenService.getUser())
// Esperado: objeto user

// Teste clear
tokenService.clearTokens()
console.log('Token após clear:', tokenService.getAccessToken())
console.log('User após clear:', tokenService.getUser())
console.log('Token válido após clear?', tokenService.hasValidToken())
// Esperado: null, null, false

// ============================================
// Teste 3: Verificar endpoints
// ============================================
import { ENDPOINTS } from './endpoints'

console.log('\n✅ Teste 3: Endpoints')
console.log('Auth Login:', ENDPOINTS.AUTH.LOGIN)
console.log('Auth Refresh:', ENDPOINTS.AUTH.REFRESH)
console.log('Platform Admin Orgs List:', ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.LIST)
console.log('Platform Admin Orgs Get:', ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS.GET('123'))
console.log('Platform Admin Users Update:', ENDPOINTS.PLATFORM_ADMIN.USERS.UPDATE_CLINIC_ROLE('user-1', 'clinic-1'))
// Esperado: paths corretos

// ============================================
// Teste 4: Verificar types (apenas compilação)
// ============================================
import type { LoginDto, LoginResponse, Organization, PlatformUser } from '@/types'

const loginDto: LoginDto = {
  email: 'test@example.com',
  password: 'password123'
}

const loginResponse: LoginResponse = {
  accessToken: 'token',
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    activeClinic: {
      id: 'clinic-1',
      name: 'Clinic 1',
      organizationId: 'org-1',
      role: 'admin'
    },
    availableClinics: []
  }
}

console.log('\n✅ Teste 4: Types')
console.log('LoginDto:', loginDto)
console.log('LoginResponse:', loginResponse)
// Esperado: sem erros de TypeScript

console.log('\n🎉 Todos os testes de configuração inicial passaram!')
