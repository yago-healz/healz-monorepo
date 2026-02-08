# 🚀 Quick Start - Testes E2E

## Comandos Rápidos

### 🟢 Primeira Execução

```bash
# 1. Subir banco de teste
pnpm test:db:up

# 2. Aguardar e executar migrations
sleep 5 && NODE_ENV=test DATABASE_URL=postgresql://healz_test:healz_test_password@localhost:5433/healz_test pnpm db:push

# 3. Executar testes
NODE_ENV=test DATABASE_URL=postgresql://healz_test:healz_test_password@localhost:5433/healz_test pnpm test:e2e
```

### 🔄 Execuções Seguintes

```bash
# Reset completo do banco (limpa tudo e recria)
pnpm test:db:reset

# Executar testes
NODE_ENV=test DATABASE_URL=postgresql://healz_test:healz_test_password@localhost:5433/healz_test pnpm test:e2e
```

### 🛑 Parar Banco de Teste

```bash
pnpm test:db:down
```

---

## 📁 Estrutura Criada

```
apps/api/
├── docker-compose.test.yml    # Container PostgreSQL para testes
├── .env.test                  # Variáveis de ambiente de teste
├── test/
│   ├── config/
│   │   └── jest-e2e.json     # Configuração do Jest
│   ├── setup/
│   │   ├── global-setup.ts   # Setup global
│   │   └── global-teardown.ts # Teardown global
│   ├── helpers/
│   │   ├── test-database.helper.ts  # Helper de banco
│   │   ├── test-auth.helper.ts      # Helper de autenticação
│   │   ├── test-fixtures.helper.ts  # Helper de fixtures
│   │   └── test-assertions.helper.ts # Helper de assertions
│   ├── e2e/
│   │   └── health/
│   │       └── health.e2e-spec.ts   # ✅ Teste do /health
│   ├── README.md                    # Documentação completa
│   ├── FASE_1_2_RESULTADOS.md      # Relatório de implementação
│   └── QUICK_START.md              # Este arquivo
```

---

## ✅ Status Atual

### Fases Concluídas

#### Fase 1: Setup Inicial ✅
- [x] Estrutura de pastas
- [x] Docker Compose
- [x] Configuração Jest
- [x] Scripts NPM
- [x] Primeiro teste passando

#### Fase 2: Helpers ✅
- [x] Database Helper
- [x] Auth Helper
- [x] Fixtures Helper
- [x] Assertions Helper
- [x] Global Setup/Teardown

### Cobertura de Testes

| Fase | Endpoint | Status |
|------|----------|--------|
| 1 | GET /health | ✅ 1 teste passando |

**Total:** 1/43 endpoints (2.3%)

---

## 📚 Documentação

- **README.md** - Documentação completa com exemplos
- **FASE_1_2_RESULTADOS.md** - Relatório detalhado da implementação

---

## 🔜 Próxima Fase

**Fase 3: Testes de Autenticação**

Implementar testes para:
- POST /auth/login
- POST /auth/switch-context
- POST /auth/refresh
- POST /auth/logout
- POST /auth/verify-email
- POST /auth/resend-verification
- POST /auth/forgot-password
- POST /auth/reset-password

**Estimativa:** ~34 cenários de teste
