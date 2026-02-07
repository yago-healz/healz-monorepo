# 08 - Cronograma e Notas Técnicas

[← Anterior: Dashboard](./07-dashboard-implementation.md) | [Índice](./00-index.md)

---

## 1. Cronograma de Implementação

### Fase 1: Configuração Base (1-2 dias)

**Objetivo:** Preparar toda a infraestrutura base do projeto

**Tarefas:**
- [ ] **1.1** Criar estrutura de pastas completa
  - `src/features/`, `src/lib/api/`, `src/services/`, `src/types/`
  - `src/hooks/`, `src/utils/`, `src/components/layout/`

- [ ] **1.2** Configurar axios com interceptors
  - Criar `src/lib/api/axios.ts`
  - Implementar request/response interceptors
  - Adicionar refresh token logic

- [ ] **1.3** Implementar token service
  - Criar `src/services/token.service.ts`
  - Métodos: get, set, clear tokens

- [ ] **1.4** Criar types globais da API
  - Criar `src/types/api.types.ts`
  - Definir todos os types (User, Organization, Clinic, etc.)

- [ ] **1.5** Configurar endpoints constants
  - Criar `src/lib/api/endpoints.ts`
  - Mapear todos os endpoints da API

- [ ] **1.6** Instalar componentes Shadcn/UI adicionais
  ```bash
  npx shadcn@latest add badge calendar command data-table skeleton switch
  ```

**Validação:**
- ✓ Axios configurado e fazendo requests
- ✓ Token service funcionando
- ✓ Types definidos sem erros
- ✓ Componentes instalados corretamente

---

### Fase 2: Autenticação (2-3 dias)

**Objetivo:** Implementar sistema completo de autenticação

**Tarefas:**
- [ ] **2.1** Implementar queries e mutations de auth
  - `src/features/auth/api/mutations.ts` (login, logout, switch context)
  - `src/features/auth/api/queries.ts` (current user)

- [ ] **2.2** Criar hook useAuth
  - `src/features/auth/hooks/use-auth.ts`
  - Centralizar lógica de autenticação

- [ ] **2.3** Implementar componente LoginForm
  - `src/features/auth/components/login-form.tsx`
  - Validação com Zod e React Hook Form

- [ ] **2.4** Criar página de login
  - `src/routes/_public.tsx` (layout)
  - `src/routes/_public/login.tsx`

- [ ] **2.5** Implementar forgot password flow
  - `src/features/auth/components/forgot-password-form.tsx`
  - `src/routes/_public/forgot-password.tsx`

- [ ] **2.6** Implementar reset password flow
  - `src/features/auth/components/reset-password-form.tsx`
  - `src/routes/_public/reset-password.tsx`

- [ ] **2.7** Implementar verify email flow
  - `src/features/auth/components/verify-email.tsx`
  - `src/routes/_public/verify-email.tsx`

- [ ] **2.8** Criar guards de autenticação para rotas
  - `beforeLoad` nas rotas autenticadas
  - Redirecionamentos automáticos

- [ ] **2.9** Testar fluxo completo de autenticação
  - Login válido/inválido
  - Forgot/reset password
  - Verify email
  - Persistência de sessão

**Validação:**
- ✓ Login funcionando
- ✓ Tokens sendo salvos corretamente
- ✓ Refresh token automático
- ✓ Redirecionamentos funcionando
- ✓ Todos os fluxos de senha testados

---

### Fase 3: Layout e Navegação (1-2 dias)

**Objetivo:** Criar estrutura de navegação e layout autenticado

**Tarefas:**
- [ ] **3.1** Implementar AppSidebar com navegação
  - `src/components/layout/app-sidebar.tsx`
  - Menu colapsável
  - Ícones e links

- [ ] **3.2** Criar AppHeader com user menu
  - `src/components/layout/app-header.tsx`
  - `src/components/layout/user-nav.tsx`
  - Avatar e dropdown de usuário

- [ ] **3.3** Implementar layout autenticado
  - `src/routes/_authenticated/_layout.tsx`
  - Integrar sidebar e header

- [ ] **3.4** Configurar rotas protegidas
  - Adicionar `beforeLoad` guards
  - Testar redirecionamentos

- [ ] **3.5** Implementar switch context (trocar clínica)
  - Botão na sidebar ou header
  - Mutation para trocar contexto

- [ ] **3.6** Testar navegação e responsividade
  - Desktop, tablet, mobile
  - Sidebar collapsible

**Validação:**
- ✓ Sidebar funcional e responsiva
- ✓ Header com user menu
- ✓ Navegação entre páginas
- ✓ Layout consistente em todas as telas

---

### Fase 4: Dashboard Admin - Organizations (2-3 dias)

**Objetivo:** CRUD completo de organizações

**Tarefas:**
- [ ] **4.1** Implementar queries/mutations de organizations
  - `src/features/platform-admin/api/organizations-api.ts`
  - List, get, create, update, updateStatus

- [ ] **4.2** Criar OrganizationsTable com filtros e paginação
  - `src/features/platform-admin/components/organizations/organizations-table.tsx`
  - Busca, filtros, sorting

- [ ] **4.3** Implementar OrganizationForm (criar/editar)
  - `src/features/platform-admin/components/organizations/organization-form.tsx`
  - Validação com Zod

- [ ] **4.4** Criar página de detalhes da organização
  - `src/routes/_authenticated/platform-admin/organizations/$id.tsx`
  - Exibir informações, clínicas, usuários

- [ ] **4.5** Implementar ações (ativar/desativar, editar status)
  - Botões e dialogs de confirmação
  - Feedback com toasts

- [ ] **4.6** Testar CRUD completo de organizações
  - Criar, ler, atualizar, deletar
  - Filtros e busca
  - Paginação

**Validação:**
- ✓ Listagem funcionando
- ✓ Criação de organização
- ✓ Edição de organização
- ✓ Alteração de status
- ✓ Filtros e busca operacionais

---

### Fase 5: Dashboard Admin - Clinics (2-3 dias)

**Objetivo:** CRUD completo de clínicas

**Tarefas:**
- [ ] **5.1** Implementar queries/mutations de clinics
  - `src/features/platform-admin/api/clinics-api.ts`
  - List, get, create, update, transfer, updateStatus

- [ ] **5.2** Criar ClinicsTable com filtros e paginação
  - `src/features/platform-admin/components/clinics/clinics-table.tsx`
  - Filtro por organização

- [ ] **5.3** Implementar ClinicForm (criar/editar)
  - `src/features/platform-admin/components/clinics/clinic-form.tsx`
  - Select de organização

- [ ] **5.4** Criar página de detalhes da clínica
  - `src/routes/_authenticated/platform-admin/clinics/$id.tsx`
  - Exibir membros, informações

- [ ] **5.5** Implementar transfer clinic
  - Dialog para transferir clínica
  - Mutation de transferência

- [ ] **5.6** Implementar ações (ativar/desativar)
  - Switch de status
  - Confirmação

- [ ] **5.7** Testar CRUD completo de clínicas
  - Todas as operações
  - Transferência entre organizações

**Validação:**
- ✓ CRUD completo funcionando
- ✓ Transferência de clínicas
- ✓ Filtros por organização

---

### Fase 6: Dashboard Admin - Users (2-3 dias)

**Objetivo:** CRUD completo de usuários + ações administrativas

**Tarefas:**
- [ ] **6.1** Implementar queries/mutations de users
  - `src/features/platform-admin/api/users-api.ts`
  - List, get, create, update, updateStatus
  - Add/remove/update clinic role
  - Reset password, verify email, impersonate, revoke sessions

- [ ] **6.2** Criar UsersTable com filtros avançados
  - `src/features/platform-admin/components/users/users-table.tsx`
  - Filtros: role, status, clinic, organization, emailVerified

- [ ] **6.3** Implementar UserForm (criar/editar)
  - `src/features/platform-admin/components/users/user-form.tsx`
  - Campos: name, email, clinic, role

- [ ] **6.4** Criar página de detalhes do usuário
  - `src/routes/_authenticated/platform-admin/users/$id.tsx`
  - Exibir clínicas do usuário

- [ ] **6.5** Implementar gerenciamento de clínicas do usuário
  - Adicionar usuário a clínica
  - Alterar role
  - Remover de clínica

- [ ] **6.6** Implementar ações (reset password, verify email, impersonate)
  - Dropdown menu com ações
  - Confirmações apropriadas

- [ ] **6.7** Testar CRUD completo de usuários
  - Todas as operações
  - Ações administrativas

**Validação:**
- ✓ CRUD funcionando
- ✓ Gerenciamento de clínicas
- ✓ Reset password
- ✓ Verify email manual
- ✓ Impersonate user
- ✓ Revoke sessions

---

### Fase 7: Dashboard Admin - Overview (1 dia)

**Objetivo:** Dashboard com estatísticas e atividades

**Tarefas:**
- [ ] **7.1** Implementar stats cards do dashboard
  - Cards com total de orgs, clinics, users
  - Indicadores de crescimento

- [ ] **7.2** Criar gráficos de atividade (opcional)
  - Gráfico de crescimento mensal
  - Chart.js ou Recharts

- [ ] **7.3** Implementar lista de atividades recentes
  - Últimas organizações criadas
  - Últimos usuários registrados

- [ ] **7.4** Testar dashboard overview
  - Dados reais da API
  - Responsividade

**Validação:**
- ✓ Stats cards com dados reais
- ✓ Dashboard responsivo
- ✓ (Opcional) Gráficos funcionando

---

### Fase 8: Refinamentos e Testes (1-2 dias)

**Objetivo:** Polimento final e garantia de qualidade

**Tarefas:**
- [ ] **8.1** Implementar loading states em todas as páginas
  - Skeleton loaders
  - Loading spinners
  - Disabled states

- [ ] **8.2** Implementar error boundaries
  - Capturar erros React
  - Páginas de erro amigáveis

- [ ] **8.3** Adicionar skeleton loaders
  - Tables skeleton
  - Cards skeleton
  - Forms skeleton

- [ ] **8.4** Melhorar mensagens de erro e toast
  - Mensagens claras
  - Feedback visual

- [ ] **8.5** Testar responsividade em todas as telas
  - Desktop (1920x1080, 1366x768)
  - Tablet (768x1024)
  - Mobile (375x667, 414x896)

- [ ] **8.6** Revisar acessibilidade (a11y)
  - Labels em formulários
  - Contraste de cores
  - Navegação por teclado

- [ ] **8.7** Otimizar performance (code splitting, lazy loading)
  - Lazy load de rotas
  - Code splitting por feature
  - Memoização onde necessário

- [ ] **8.8** Testes de integração end-to-end
  - Fluxo completo de login
  - CRUD de organizations
  - CRUD de clinics
  - CRUD de users

**Validação:**
- ✓ Todos os loading states implementados
- ✓ Sem erros no console
- ✓ Responsivo em todos os tamanhos
- ✓ Acessível
- ✓ Performance otimizada

---

## 2. Estimativa Total: 12-19 dias

| Fase | Descrição | Dias |
|------|-----------|------|
| 1 | Configuração Base | 1-2 |
| 2 | Autenticação | 2-3 |
| 3 | Layout e Navegação | 1-2 |
| 4 | Organizations | 2-3 |
| 5 | Clinics | 2-3 |
| 6 | Users | 2-3 |
| 7 | Dashboard Overview | 1 |
| 8 | Refinamentos e Testes | 1-2 |
| **Total** | | **12-19** |

---

## 3. Notas Técnicas Importantes

### 3.1. Refresh Token Strategy

A API implementa **refresh token rotation** para segurança. O frontend deve:

1. **Armazenar apenas o access token** no localStorage
2. **O refresh token** é armazenado em cookie httpOnly (gerenciado automaticamente pelo backend)
3. **Quando o access token expira** (401), fazer request para `/auth/refresh`
4. **Se o refresh falhar**, limpar tokens e redirecionar para login

**Implementação:**
```typescript
// O interceptor do axios já trata isso automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Tenta renovar o token
      const { data } = await axios.post('/auth/refresh', {}, { withCredentials: true })
      tokenService.setAccessToken(data.accessToken)
      // Refaz request original
      return api(originalRequest)
    }
  }
)
```

### 3.2. Multi-tenancy e Context Switching

- **Usuário pode ter acesso a múltiplas clínicas**
- **A clínica ativa** está no token JWT (campo `activeClinic`)
- **Para trocar de clínica**: `POST /auth/switch-context`
- **Isso gera um novo access token** com contexto atualizado
- **Invalidar queries** após switch context

**Implementação:**
```typescript
const switchContext = async (clinicId: string) => {
  const { data } = await api.post('/auth/switch-context', { clinicId })
  tokenService.setAccessToken(data.accessToken)
  queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
  // Recarregar dados específicos do contexto
}
```

### 3.3. Tanstack Query Best Practices

**Query Keys Hierárquicas:**
```typescript
['platform-admin', 'organizations']           // Base
['platform-admin', 'organizations', params]   // With params
['platform-admin', 'organizations', '123']    // Specific ID
```

**Invalidação após Mutations:**
```typescript
onSuccess: (_, variables) => {
  // Invalidar lista
  queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] })
  // Invalidar item específico
  queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations', variables.id] })
}
```

**Usar `enabled` para queries condicionais:**
```typescript
useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  enabled: !!id, // Só executa se id existir
})
```

**Configurar `staleTime` e `gcTime`:**
```typescript
useQuery({
  queryKey: ['organizations'],
  queryFn: fetchOrganizations,
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 10 * 60 * 1000,   // 10 minutos
})
```

### 3.4. Tanstack Router Type Safety

**Usar `createFileRoute` para type-safe routes:**
```typescript
export const Route = createFileRoute('/_authenticated/platform-admin/organizations/$id')({
  component: OrganizationDetails,
})
```

**Implementar `beforeLoad` para guards:**
```typescript
beforeLoad: () => {
  if (!tokenService.hasValidToken()) {
    throw redirect({ to: '/login' })
  }
}
```

**Search params tipados:**
```typescript
const searchSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const Route = createFileRoute('/organizations')({
  validateSearch: searchSchema,
})
```

### 3.5. Shadcn/UI Customization

- **Componentes são copiados** para o projeto (não importados de npm)
- **Podem ser customizados** livremente em `src/components/ui/`
- **Usar o CLI** para adicionar novos: `npx shadcn@latest add <component>`
- **Seguir blocks/examples** da documentação oficial

**Customização de variantes:**
```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
        outline: "...",
        // Adicionar nova variante
        custom: "bg-purple-500 text-white hover:bg-purple-600",
      },
    },
  }
)
```

---

## 4. Próximos Passos (Após Conclusão)

Após concluir este plano, os próximos passos incluem:

1. **Implementar módulo de Invites** (feature completa)
   - Envio de convites
   - Aceitação de convites
   - Listagem de convites pendentes

2. **Criar módulo de gerenciamento de clínicas** (feature para org admins)
   - Dashboard da organização
   - Gerenciamento de clínicas próprias
   - Gerenciamento de membros

3. **Implementar dashboard de clínica** (para doctors/secretaries)
   - Visão da clínica ativa
   - Gerenciamento de pacientes
   - Agenda

4. **Adicionar módulo de pacientes**
   - CRUD de pacientes
   - Histórico médico
   - Documentos

5. **Implementar agendamentos**
   - Calendário de consultas
   - Agendamento online
   - Confirmação automática

6. **Criar sistema de prontuários**
   - Prontuário eletrônico
   - Templates
   - Assinatura digital

---

## 5. Apêndices

### A. Variáveis de Ambiente

Criar arquivo `.env.local`:

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

**Uso no código:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'
```

### B. Scripts Úteis

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  }
}
```

### C. Referências

**Documentação:**
- [Tanstack Router](https://tanstack.com/router) - Roteamento file-based
- [Tanstack Query](https://tanstack.com/query) - State management assíncrono
- [Shadcn/UI](https://ui.shadcn.com) - Sistema de componentes
- [Tailwind CSS](https://tailwindcss.com) - Estilização utilitária
- [React Hook Form](https://react-hook-form.com) - Gerenciamento de formulários
- [Zod](https://zod.dev) - Validação de schemas

**Recursos:**
- [Shadcn/UI Blocks](https://ui.shadcn.com/blocks) - Componentes prontos
- [Lucide Icons](https://lucide.dev) - Biblioteca de ícones
- [Sonner](https://sonner.emilkowal.ski/) - Toast notifications

### D. Comandos Rápidos

```bash
# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Preview build
npm run preview

# Adicionar componente Shadcn
npx shadcn@latest add <component-name>

# Type check
npm run type-check

# Lint
npm run lint
```

---

## 6. Conclusão

Este plano de implementação fornece um roteiro detalhado para construir o frontend da plataforma Healz. Seguindo as fases sequencialmente, você terá:

- ✅ **Sistema de autenticação completo**
- ✅ **Dashboard administrativo funcional**
- ✅ **CRUD completo** de Organizations, Clinics e Users
- ✅ **Arquitetura escalável** e bem organizada
- ✅ **Type-safety** completo com TypeScript
- ✅ **UI/UX moderna** com Shadcn/UI e Tailwind

**Tempo estimado total:** 12-19 dias de desenvolvimento.

**Boa sorte com a implementação! 🚀**

---

[← Anterior: Dashboard](./07-dashboard-implementation.md) | [Índice](./00-index.md)
