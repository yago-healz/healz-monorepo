# Implementação: Deployment e CI/CD

## Visão Geral

Deploy automatizado no Render usando Infrastructure as Code (Blueprint).

**Fluxo:**
```
Push para main → Render detecta → Build filtrado → Deploy independente
```

---

## Fase 1: Render Blueprint (IaC)

### 1.1 Criar render.yaml

Criar `render.yaml` na raiz do projeto:
```yaml
services:
  # API NestJS
  - type: web
    name: healz-api
    runtime: node
    plan: free
    rootDir: apps/api
    buildCommand: cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @healz/api build
    startCommand: node dist/main
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: healz-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: healz-redis
          property: connectionString
    buildFilter:
      paths:
        - apps/api/**
        - packages/shared/**
        - pnpm-lock.yaml
      ignoredPaths:
        - "**/*.md"
        - "**/*.test.ts"
        - docs/**

  # Frontend React (Static Site)
  - type: web
    name: healz-web
    runtime: static
    plan: free
    rootDir: apps/web
    buildCommand: cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @healz/web build
    staticPublishPath: dist
    headers:
      - path: /*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /index.html
        name: Cache-Control
        value: no-cache
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_URL
        value: https://healz-api.onrender.com
    buildFilter:
      paths:
        - apps/web/**
        - packages/shared/**
        - pnpm-lock.yaml
      ignoredPaths:
        - "**/*.md"
        - "**/*.test.ts"
        - docs/**

# Redis
  - type: redis
    name: healz-redis
    plan: free
    ipAllowList: []
    maxmemoryPolicy: allkeys-lru

# PostgreSQL
databases:
  - name: healz-db
    plan: free
    databaseName: healz
    user: healz
```

### 1.2 Conectar repositório ao Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **Blueprints** → **New Blueprint Instance**
3. Conecte o repositório GitHub
4. Selecione a branch `main`
5. Render detectará o `render.yaml` automaticamente
6. Clique em **Apply**

---

## Fase 2: Variáveis de Ambiente

### 2.1 Variáveis automáticas (via render.yaml)

Já configuradas no Blueprint:
- `DATABASE_URL` - conexão PostgreSQL
- `REDIS_URL` - conexão Redis
- `NODE_ENV` - ambiente
- `VITE_API_URL` - URL da API para o frontend

### 2.2 Variáveis manuais (se necessário)

No Dashboard do Render, adicionar em cada serviço:
- `JWT_SECRET` - quando implementar auth
- `SENTRY_DSN` - quando implementar monitoring

---

## Fase 3: Deploy Automático

### 3.1 Comportamento padrão

O Render faz autodeploy quando:
- Há push/merge na branch `main`
- Arquivos modificados correspondem ao `buildFilter.paths`
- Arquivos modificados NÃO estão no `buildFilter.ignoredPaths`

### 3.2 Deploys independentes

Com os `buildFilter` configurados:
- Mudanças em `apps/api/**` → só deploy da API
- Mudanças em `apps/web/**` → só deploy do frontend
- Mudanças em `packages/shared/**` → deploy de ambos

### 3.3 Deploy manual (se necessário)

```bash
# Via Render CLI (opcional)
render deploy --service healz-api
render deploy --service healz-web
```

Ou pelo Dashboard: Settings → Manual Deploy

---

## Fase 4: Projeção de Custos

### Free Tier (início)

| Recurso | Limite | Custo |
|---------|--------|-------|
| API (web service) | Spin-down após 15min inatividade | $0 |
| Frontend (static) | 100GB bandwidth/mês | $0 |
| PostgreSQL | 1GB storage, expira em 90 dias | $0 |
| Redis | 25MB | $0 |

**Limitações Free:**
- Cold start de ~30s após inatividade
- PostgreSQL expira (migrar para Starter antes)
- Sem SLA

### Starter (produção inicial)

| Recurso | Especificação | Custo/mês |
|---------|---------------|-----------|
| API | 512MB RAM, sempre ativo | $7 |
| PostgreSQL | 1GB storage, backup diário | $7 |
| Redis | 25MB, persistente | $10 |
| Frontend | Static (gratuito) | $0 |

**Total Starter:** ~$24/mês

### Standard (escala)

| Recurso | Especificação | Custo/mês |
|---------|---------------|-----------|
| API | 2GB RAM, auto-scale | $25+ |
| PostgreSQL | 10GB storage | $20 |
| Redis | 100MB+ | $20+ |

**Total Standard:** ~$65+/mês

---

## Fase 5: Staging (Futuro)

### 5.1 Estratégia recomendada

Criar um segundo Blueprint para staging:

Criar `render.staging.yaml`:
```yaml
services:
  - type: web
    name: healz-api-staging
    runtime: node
    plan: free
    branch: develop  # Branch diferente
    rootDir: apps/api
    # ... mesma config com URLs diferentes
    envVars:
      - key: NODE_ENV
        value: staging
      - key: DATABASE_URL
        fromDatabase:
          name: healz-db-staging
          property: connectionString

  - type: web
    name: healz-web-staging
    runtime: static
    plan: free
    branch: develop
    rootDir: apps/web
    envVars:
      - key: VITE_API_URL
        value: https://healz-api-staging.onrender.com

databases:
  - name: healz-db-staging
    plan: free
    databaseName: healz_staging
    user: healz
```

### 5.2 Fluxo com staging

```
feature/* → PR para develop → deploy staging → PR para main → deploy produção
```

---

## Fase 6: Monitoramento Básico

### 6.1 Health checks (já configurado)

O `healthCheckPath: /health` no render.yaml faz:
- Render checa o endpoint periodicamente
- Restart automático se falhar 3x consecutivas
- Alertas no Dashboard

### 6.2 Logs

Acessar logs pelo Dashboard:
- **Logs** → ver output em tempo real
- Retenção: 7 dias (free), 30 dias (paid)

### 6.3 Métricas

Dashboard mostra:
- CPU usage
- Memory usage
- Response times
- Request count

---

## Checklist de Conclusão

- [ ] `render.yaml` criado na raiz
- [ ] Blueprint conectado no Render Dashboard
- [ ] Primeiro deploy executado com sucesso
- [ ] API respondendo em `https://healz-api.onrender.com/health`
- [ ] Frontend acessível em `https://healz-web.onrender.com`
- [ ] Build filters funcionando (testar mudança isolada)
- [ ] Variáveis de ambiente configuradas

---

## Troubleshooting

### Build falha

```bash
# Verificar logs no Dashboard
# Comum: falta pnpm-lock.yaml ou versão incompatível

# Garantir lock file atualizado
pnpm install
git add pnpm-lock.yaml
git commit -m "Update lock file"
```

### Cold start lento

- Esperado no Free tier (~30s)
- Solução: upgrade para Starter ($7/mês)

### Database connection refused

- Verificar se PostgreSQL terminou de provisionar
- Aguardar ~2min após primeiro deploy
- Verificar connection string no Dashboard

### Frontend não atualiza

- Cache do CDN pode levar ~5min
- Headers configurados para cache longo em assets
- `index.html` tem `no-cache` para refletir mudanças
