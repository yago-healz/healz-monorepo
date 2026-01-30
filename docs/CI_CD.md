# CI/CD - Continuous Integration & Deployment

## Visão Geral

Pipeline de CI/CD completo para monorepo Healz usando **Turborepo** para builds inteligentes, **GitHub Actions** para orquestração e **Cloud Build** para builds pesados de Docker.

## Estratégia

### Hybrid CI/CD

**GitHub Actions** (orquestração) + **Cloud Build** (Docker builds)

**Por quê?**
- ✅ GitHub Actions: Grátis para repos públicos, familiar ao time
- ✅ Cloud Build: Mais próximo do GCP, builds mais rápidos (rede interna)
- ✅ Best of both: Orquestração no GitHub, builds pesados no GCP

## Change Detection

### Como Funciona

1. **Turborepo** detecta mudanças via `git diff`
2. **GitHub Actions** usa **path filters** para triggerar workflows
3. Só executa pipelines de apps que mudaram

### Exemplo

**Commit altera** `apps/api/src/patients/patient.service.ts`:
- ✅ Pipeline API executa (lint, test, build, deploy)
- ❌ Pipeline Web NÃO executa (economiza tempo e $)

**Commit altera** `packages/shared-types/src/events.ts`:
- ✅ Pipeline API executa (depende de shared-types)
- ✅ Pipeline Web executa (depende de shared-types)

### Configuração Path Filters

**.github/workflows/api-ci.yml**:
```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/api/**'
      - 'packages/shared-types/**'
      - 'packages/event-schemas/**'
      - 'packages/database-schema/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/api/**'
      - 'packages/shared-types/**'
```

**.github/workflows/web-ci.yml**:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/shared-types/**'
      - 'packages/ui-components/**'
```

## Pipeline API

### Estágios

```
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies (com cache)
4. Typecheck (turbo run typecheck --filter=api)
5. Lint (turbo run lint --filter=api)
6. Unit tests (turbo run test --filter=api)
7. Integration tests (com test database)
8. Build Docker image (Cloud Build)
9. Push to Artifact Registry
10. Deploy to Cloud Run
11. Run migrations (Cloud Run Job)
12. Health check
13. Slack notification
```

### Workflow Completo

**.github/workflows/api-deploy.yml**:
```yaml
name: API - Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'
  workflow_dispatch:  # Manual trigger

env:
  PROJECT_ID: healz-prod
  REGION: southamerica-east1
  SERVICE_NAME: healz-api

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: healz_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Para turbo change detection

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm turbo run typecheck --filter=api

      - name: Lint
        run: pnpm turbo run lint --filter=api

      - name: Unit Tests
        run: pnpm turbo run test --filter=api
        env:
          NODE_ENV: test

      - name: Integration Tests
        run: pnpm turbo run test:integration --filter=api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/healz_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info

  build:
    name: Build & Push Docker Image
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build with Cloud Build
        run: |
          gcloud builds submit \
            --config=cloudbuild.yaml \
            --substitutions=COMMIT_SHA=${{ github.sha }},_REGION=${{ env.REGION }}

      - name: Output image URL
        run: |
          echo "IMAGE_URL=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/healz/api:${{ github.sha }}" >> $GITHUB_ENV

  deploy:
    name: Deploy to Cloud Run
    needs: build
    runs-on: ubuntu-latest
    environment: production  # Requer aprovação manual no GitHub

    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Run Database Migrations
        run: |
          gcloud run jobs execute healz-migrations \
            --region=${{ env.REGION }} \
            --wait

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/healz/api:${{ github.sha }} \
            --platform=managed \
            --region=${{ env.REGION }} \
            --min-instances=0 \
            --max-instances=10 \
            --cpu=1 \
            --memory=1Gi \
            --timeout=300s \
            --concurrency=80 \
            --vpc-connector=healz-vpc-connector

      - name: Health Check
        run: |
          SERVICE_URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)')

          for i in {1..10}; do
            if curl -f "${SERVICE_URL}/health"; then
              echo "✅ Health check passed"
              exit 0
            fi
            echo "⏳ Waiting for service... (attempt $i/10)"
            sleep 5
          done
          echo "❌ Health check failed"
          exit 1

      - name: Notify Slack (Success)
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: |
            🚀 API deployed to production
            Commit: ${{ github.sha }}
            Author: ${{ github.actor }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify Slack (Failure)
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: |
            ❌ API deployment failed
            Commit: ${{ github.sha }}
            Author: ${{ github.actor }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Cloud Build Configuration

**cloudbuild.yaml**:
```yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:$COMMIT_SHA'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:latest'
      - '-f'
      - 'apps/api/Dockerfile'
      - '.'

  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:$COMMIT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:latest'

images:
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:$COMMIT_SHA'
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/healz/api:latest'

options:
  machineType: 'N1_HIGHCPU_8'  # Build mais rápido
  diskSizeGb: 100

substitutions:
  _REGION: southamerica-east1

timeout: 1200s  # 20 minutos
```

## Pipeline Web (Frontend)

### Estágios

```
1. Checkout code
2. Setup Node.js + pnpm
3. Install dependencies
4. Typecheck
5. Lint
6. Unit tests (Vitest)
7. Build (Vite)
8. Upload to Cloud Storage
9. Invalidate CDN cache
10. Slack notification
```

### Workflow Completo

**.github/workflows/web-deploy.yml**:
```yaml
name: Web - Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/shared-types/**'
      - 'packages/ui-components/**'

env:
  BUCKET_NAME: healz-web-prod

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm turbo run typecheck --filter=web

      - name: Lint
        run: pnpm turbo run lint --filter=web

      - name: Unit Tests
        run: pnpm turbo run test --filter=web

  build-and-deploy:
    name: Build & Deploy
    needs: test
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build --filter=web
        env:
          VITE_API_URL: https://api.healz.com.br
          VITE_ENV: production

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Upload to Cloud Storage
        run: |
          gsutil -m rsync -r -d apps/web/dist gs://${{ env.BUCKET_NAME }}

      - name: Set cache headers
        run: |
          # HTML: no-cache (sempre revalida)
          gsutil -m setmeta -h "Cache-Control:no-cache,max-age=0" \
            gs://${{ env.BUCKET_NAME }}/*.html

          # JS/CSS: cache agressivo (tem hash no filename)
          gsutil -m setmeta -h "Cache-Control:public,max-age=31536000,immutable" \
            "gs://${{ env.BUCKET_NAME }}/assets/*.js" \
            "gs://${{ env.BUCKET_NAME }}/assets/*.css"

      - name: Invalidate CDN Cache
        run: |
          gcloud compute url-maps invalidate-cdn-cache healz-lb \
            --path "/*" \
            --async

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            🌐 Frontend deployed
            Commit: ${{ github.sha }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Docker Optimization

### Multi-Stage Build (API)

**apps/api/Dockerfile**:
```dockerfile
# Stage 1: Base
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.0.0 --activate
WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo run build --filter=api

# Stage 4: Production (imagem mínima)
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Só copia o necessário para rodar
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 8080
CMD ["node", "dist/main.js"]
```

**Otimizações**:
- ✅ Layer caching: dependencies mudam menos que código
- ✅ Imagem final: ~150MB (vs 1GB+ sem multi-stage)
- ✅ Segurança: Sem devDependencies em produção

## Turborepo Caching

### Local Cache

**.turbo/cache/** é automaticamente criado e usado.

### Remote Cache (Cloud Storage)

**turbo.json**:
```json
{
  "remoteCache": {
    "signature": true
  }
}
```

**Setup**:
```bash
# Criar bucket para cache
gsutil mb -p healz-prod -c STANDARD -l southamerica-east1 \
  gs://healz-turborepo-cache

# Autenticar turbo
npx turbo login

# Linkar ao workspace
npx turbo link
```

**Benefício**: Cache compartilhado entre desenvolvedores e CI.

## Branch Strategy

### Branches

- **main**: Produção (protected, requer review)
- **develop**: Staging (merge antes de main)
- **feature/***: Features individuais

### Pull Request Workflow

```
1. Developer cria branch feature/nova-feature
2. Push → GitHub Actions roda CI (test, lint, build)
3. PR para develop
4. Code review + aprovação
5. Merge para develop → Deploy automático em staging
6. Testes em staging
7. PR develop → main
8. Aprovação manual no GitHub
9. Merge → Deploy automático em production
```

### Protection Rules (main branch)

- ✅ Require PR review (1 approval)
- ✅ Require status checks (CI deve passar)
- ✅ Require branches up-to-date
- ✅ Require linear history
- ❌ Allow force push

## Secrets Management

### GitHub Secrets

Configurar em **Settings → Secrets → Actions**:

```
GCP_SA_KEY              # Service account JSON para deploy
SLACK_WEBHOOK           # Webhook para notificações
CODECOV_TOKEN           # Token do Codecov (coverage)
```

### GCP Service Account

**Permissões necessárias**:
- Cloud Run Admin
- Cloud Build Editor
- Artifact Registry Writer
- Secret Manager Secret Accessor

**Criar**:
```bash
# Service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Permissions
gcloud projects add-iam-policy-binding healz-prod \
  --member="serviceAccount:github-actions@healz-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding healz-prod \
  --member="serviceAccount:github-actions@healz-prod.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Download key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@healz-prod.iam.gserviceaccount.com

# Adicionar como secret no GitHub (copiar conteúdo de key.json)
```

## Performance

### Build Times (estimados)

| Pipeline | Duração | Custo |
|----------|---------|-------|
| API CI (test) | 3-5 min | Grátis (GitHub) |
| API Build (Cloud Build) | 2-3 min | $0.003 |
| API Deploy | 1-2 min | Grátis (gcloud CLI) |
| **Total API** | **6-10 min** | **$0.003** |
| | | |
| Web CI (test) | 2-3 min | Grátis |
| Web Build | 1-2 min | Grátis |
| Web Deploy | 30s | Grátis (gsutil) |
| **Total Web** | **3.5-5.5 min** | **Grátis** |

### Otimizações

- ✅ Turborepo cache: Evita rebuilds desnecessários
- ✅ pnpm: 2x mais rápido que npm
- ✅ Path filters: Só roda pipelines afetados
- ✅ Docker layer caching: Dependencies cached
- ✅ Parallel jobs: Test + lint rodam em paralelo

## Monitoramento de CI/CD

### Métricas

- **Build success rate**: >95%
- **Average build time**: <10 min
- **Deployment frequency**: Diária
- **Change failure rate**: <5%
- **Time to restore**: <30 min (rollback)

### Dashboards

**GitHub Actions**: Visualizar em **Actions → Summary**

**Cloud Build**: Dashboard em Cloud Console

## Próximos Passos

- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Estratégia de deployment
- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Terraform IaC
- [**MONITORING.md**](./MONITORING.md) - Observabilidade
