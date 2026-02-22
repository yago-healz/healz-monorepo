# Task 07 — Validação Final

**Objetivo:** Garantir que tudo funciona identicamente após a reestruturação.

---

## Checklist de validação

### 1. Compilação TypeScript
```bash
cd apps/api && pnpm exec tsc --noEmit
```
Deve compilar sem erros.

### 2. Testes unitários
```bash
cd apps/api && pnpm test
```
Todos os testes devem passar (30+ unit tests).

### 3. Lint
```bash
cd apps/api && pnpm lint
```
Sem erros de lint.

### 4. Verificar imports órfãos

Nenhum import deve referenciar os paths antigos:

```bash
# Paths antigos que NÃO devem existir em imports
grep -rn "from ['\"]\..*\/src\/auth\/" apps/api/src/ --include="*.ts"
grep -rn "from ['\"]\..*\/src\/db" apps/api/src/ --include="*.ts"
grep -rn "from ['\"]\..*\/src\/audit\/" apps/api/src/ --include="*.ts"
grep -rn "from ['\"]\..*\/src\/mail\/" apps/api/src/ --include="*.ts"
grep -rn "from ['\"]\..*\/src\/event-sourcing\/" apps/api/src/ --include="*.ts"
```

Todos devem retornar vazio.

### 5. Verificar que não ficou nenhum arquivo perdido em `src/`

```bash
# src/ deve conter apenas:
# - main.ts
# - app.module.ts
# - health.controller.ts
# - common/
# - infrastructure/
# - modules/
ls -la apps/api/src/
```

### 6. Drizzle migrations

```bash
cd apps/api && pnpm exec drizzle-kit generate
```
Deve detectar schema corretamente (sem gerar migration vazia = nada mudou).

### 7. Servidor inicia

```bash
cd apps/api && pnpm dev
```
Deve iniciar sem erros, Swagger acessível em `http://localhost:3001/api/v1/docs`.

### 8. Testes E2E (se ambiente disponível)

```bash
cd apps/api && pnpm test:e2e
```

---

## Done when

- [ ] TypeScript compila sem erros
- [ ] Testes unitários passam
- [ ] Lint passa
- [ ] Nenhum import órfão
- [ ] `src/` limpo (só main.ts, app.module.ts, health.controller.ts + 3 pastas)
- [ ] Drizzle reconhece schemas
- [ ] Servidor inicia normalmente
