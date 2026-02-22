# Task 06 — Atualizar Configurações Externas

**Objetivo:** Atualizar arquivos de configuração que referenciam paths de `src/`.

---

## Arquivos a atualizar

### 1. `drizzle.config.ts`

```typescript
// ANTES
schema: "./src/db/schema/*",
out: "./src/db/migrations",

// DEPOIS
schema: "./src/infrastructure/database/schema/*",
out: "./src/infrastructure/database/migrations",
```

### 2. `tsconfig.json` (se tiver path aliases)

Verificar se existe `paths` configurado. Se sim, atualizar. Se não, considerar adicionar aliases para simplificar imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@common/*": ["src/common/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

**Nota:** path aliases são opcionais neste momento. Se o projeto não usa, não é obrigatório adicionar. Pode ser feito como melhoria futura.

### 3. `jest.config.js` e `test/config/jest-e2e.json`

Verificar se há `moduleNameMapper` ou `roots` que referenciam paths de `src/`. Se sim, atualizar.

### 4. `nest-cli.json`

Verificar se referencia paths específicos de `src/`. Geralmente não precisa mudar.

### 5. `package.json` scripts

Verificar scripts que referenciam paths de src:
- `seed` script pode referenciar `src/db/seeds/`
- `migrate` script pode referenciar paths de db

```json
// Se existir algo como:
"seed": "tsx src/db/seeds/create-platform-admin.ts"
// Mudar para:
"seed": "tsx src/infrastructure/database/seeds/create-platform-admin.ts"
```

---

## Testes E2E

Os testes em `test/e2e/` importam helpers que podem referenciar `src/`. Verificar:

```bash
grep -r "from.*src/" apps/api/test/ --include="*.ts"
```

Atualizar qualquer import que referencia paths antigos.

---

## Done when

- `drizzle.config.ts` aponta para novos paths
- `pnpm exec drizzle-kit generate` funciona (se aplicável)
- Scripts de seed/migrate funcionam
- Configuração de testes aponta para paths corretos
