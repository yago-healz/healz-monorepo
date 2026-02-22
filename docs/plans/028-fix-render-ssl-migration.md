# Plano 028 — Fix: SSL na migration do Render

**Objetivo:** Corrigir o erro `DEPTH_ZERO_SELF_SIGNED_CERT` que quebra o build do Render ao executar `drizzle-kit migrate`.

---

## Diagnóstico

**Erro:**
```
DrizzleQueryError: Failed query: CREATE SCHEMA IF NOT EXISTS "drizzle"
cause: Error: self-signed certificate
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

**Root cause:**

`drizzle.config.ts` append `sslmode=require` na `DATABASE_URL` para ambientes não-locais. Nas versões atuais de `pg-connection-string` / `pg`, `sslmode=require` passou a ser tratado como alias de `verify-full` (valida a cadeia de certificados SSL). O PostgreSQL do Render usa um certificado auto-assinado → validação falha → migration falha → build falha.

O próprio `pg` avisa sobre isso nos logs:
```
SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated
as aliases for 'verify-full'.
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'
```

**Inconsistência atual:**
- `database/index.ts` (runtime) → usa `ssl: { rejectUnauthorized: false }` ✅ funciona
- `drizzle.config.ts` (migration) → usa `sslmode=require` na URL → valida cert ❌ quebra

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/api/drizzle.config.ts` | Modificar: trocar `sslmode=require` por `uselibpqcompat=true&sslmode=require` |

---

## Implementação

### 1. Modificar `apps/api/drizzle.config.ts`

**Atual:**
```typescript
const sslUrl =
  isLocalDb || !dbUrl
    ? dbUrl
    : `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}sslmode=require`;
```

**Novo:**
```typescript
const sslUrl =
  isLocalDb || !dbUrl
    ? dbUrl
    : `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`;
```

**Por quê:** `uselibpqcompat=true` ativa a semântica libpq original onde `sslmode=require` significa "exigir criptografia, mas não verificar o certificado". Isso mantém a conexão segura (criptografada) sem rejeitar o cert auto-assinado do Render.

---

## Ordem de execução

1. Aplicar a mudança em `drizzle.config.ts`
2. Fazer commit e push → o próximo deploy no Render deve passar

---

## Verificação

Após o deploy:
- O log deve mostrar `applying migrations...` sem erros de SSL
- As tabelas do banco devem estar atualizadas

---

## Alternativa (se a fix principal não funcionar)

Modificar o script `db:migrate` no `package.json` para desabilitar a verificação TLS somente durante a migration:

```json
"db:migrate": "NODE_TLS_REJECT_UNAUTHORIZED=0 drizzle-kit migrate"
```

Isso funciona mas é mais amplo (desabilita TLS verification para o processo inteiro do node durante a migration).

---

## Fora do escopo

- Alterar a configuração SSL do runtime (`database/index.ts`) — já funciona corretamente
- Configurar certificados SSL válidos no Render — não necessário para ambiente atual
