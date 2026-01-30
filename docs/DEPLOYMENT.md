# Deployment Strategy

## Visão Geral

Estratégia de deployment para Healz focada em **zero-downtime**, **database migrations seguras** (Event Sourcing) e **rollback rápido**.

## Princípios

1. **Zero-downtime**: Usuários não percebem deploy
2. **Rollback rápido**: Reverter em <2 minutos
3. **Migrations seguras**: Expand-Contract pattern para Event Store
4. **Idempotência**: Deploy pode ser reexecutado sem efeitos colaterais
5. **Observabilidade**: Métricas durante e após deploy

## Cloud Run Deployment

### Rolling Deployment (Automático)

Cloud Run gerencia rolling deployment nativamente:

```
1. Nova revisão criada (healz-api-00043)
2. Health checks validam nova instância
3. Tráfego migra gradualmente:
   - 0% → nova revisão
   - 25% → nova revisão (se health OK)
   - 50% → nova revisão
   - 100% → nova revisão (deploy completo)
4. Revisão antiga (healz-api-00042) fica disponível 5min
5. Revisão antiga é terminada
```

**Tempo total**: ~30-60 segundos

### Deploy Command

```bash
gcloud run deploy healz-api \
  --image southamerica-east1-docker.pkg.dev/healz-prod/healz/api:$COMMIT_SHA \
  --platform managed \
  --region southamerica-east1 \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 300s \
  --concurrency 80 \
  --vpc-connector healz-vpc-connector \
  --set-env-vars NODE_ENV=production
```

### Traffic Splitting (Canary)

Para deploys de alto risco, use canary:

```bash
# 1. Deploy nova revisão SEM tráfego
gcloud run deploy healz-api \
  --image=...nova-image \
  --no-traffic \
  --tag canary

# 2. Testar canary
curl https://canary---healz-api-xxx.a.run.app/health

# 3. Enviar 10% do tráfego
gcloud run services update-traffic healz-api \
  --to-revisions canary=10,healz-api-00042=90

# 4. Monitorar métricas (10-15 min)
# - Error rate
# - Latency p95
# - Event write latency

# 5a. Se OK: migrar 100%
gcloud run services update-traffic healz-api --to-latest

# 5b. Se falhar: rollback
gcloud run services update-traffic healz-api \
  --to-revisions healz-api-00042=100
```

## Database Migrations

### Desafio: Event Store é Imutável

**Problema**: Eventos nunca podem ser modificados ou deletados.

**Implicação**: Migrations precisam ser **backward-compatible**.

### Expand-Contract Pattern

Padrão de 3 fases para migrations seguras:

#### Fase 1: EXPAND (Adicionar)

**Adicionar novo schema SEM remover o antigo**

```sql
-- Migration 001_add_patient_email.sql
-- ✅ PERMITIDO: Adicionar coluna nullable
ALTER TABLE events ADD COLUMN patient_email TEXT;

-- ✅ PERMITIDO: Adicionar índice
CREATE INDEX idx_events_patient_email ON events(tenant_id, patient_email);

-- ✅ PERMITIDO: Adicionar tabela
CREATE TABLE patient_preferences (
  patient_id UUID PRIMARY KEY,
  notification_enabled BOOLEAN DEFAULT TRUE
);
```

**Deploy API v2**: Escreve nos dois campos (novo e antigo)

```typescript
// API v2 - Escreve em ambos
const event = {
  event_type: 'PatientRegistered',
  event_data: {
    phone: '+5511999999999',        // Campo antigo (mantém)
    patient_email: 'teste@email.com' // Campo novo
  }
};
```

**Compatibilidade**: API v1 (antiga) ainda funciona, ignora `patient_email`.

#### Fase 2: BACKFILL (Preencher)

**Preencher dados antigos assincronamente**

```sql
-- Job assíncrono (roda fora do deploy)
UPDATE events
SET patient_email = event_data->>'email'
WHERE event_type = 'PatientRegistered'
  AND patient_email IS NULL;
```

**Implementação**: Cloud Run Job executado manualmente

```bash
gcloud run jobs execute healz-backfill-patient-email \
  --region southamerica-east1 \
  --wait
```

#### Fase 3: CONTRACT (Remover)

**Após TODAS instâncias usarem o novo campo**

```sql
-- Migration 002_make_patient_email_required.sql
-- ✅ PERMITIDO: Tornar NOT NULL (após backfill)
ALTER TABLE events ALTER COLUMN patient_email SET NOT NULL;

-- ❌ NUNCA: Remover coluna antiga
-- ALTER TABLE events DROP COLUMN phone;  -- BLOQUEADO!
```

### Proteção: Custom Drizzle Validator

**drizzle.config.ts**:
```typescript
export default {
  schema: "./src/database/schema/*.ts",
  out: "./drizzle/migrations",
  driver: "pg",

  // Validação customizada
  onMigrationCreate: (migration: string) => {
    // Bloquear DROP COLUMN na tabela events
    if (migration.includes('DROP COLUMN') && migration.includes('events')) {
      throw new Error(
        '🚨 BLOQUEADO: Não é permitido DROP COLUMN na tabela events (Event Store é imutável)'
      );
    }

    // Bloquear ALTER COLUMN que possa quebrar eventos antigos
    if (migration.includes('ALTER COLUMN') && migration.includes('events')) {
      console.warn('⚠️  ATENÇÃO: Alteração em coluna da tabela events. Validar backward-compatibility!');
    }
  }
};
```

### Migration Execution

**Cloud Run Job** para executar migrations:

**Terraform**:
```hcl
resource "google_cloud_run_job" "healz_migrations" {
  name     = "healz-migrations"
  location = "southamerica-east1"

  template {
    template {
      containers {
        image = "southamerica-east1-docker.pkg.dev/healz-prod/healz/api:latest"

        command = ["pnpm", "run", "migration:run"]

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = "database-url"
              key  = "latest"
            }
          }
        }
      }
    }
  }
}
```

**GitHub Actions** (no pipeline de deploy):
```yaml
- name: Run Database Migrations
  run: |
    gcloud run jobs execute healz-migrations \
      --region=southamerica-east1 \
      --wait
```

### Migration Rollback

**Problema**: Migrations são difíceis de reverter em Event Sourcing.

**Estratégias**:

1. **Forward-fix** (recomendado):
   - Deploy hotfix com migration compensatória
   - Exemplo: Se adicionou coluna errada, adicionar a correta

2. **Point-in-Time Recovery** (último recurso):
   ```bash
   gcloud sql backups restore \
     --backup-id=1234567890 \
     --backup-instance=healz-postgres-prod \
     --target-instance=healz-postgres-prod-restored
   ```
   - ⚠️ Perde dados após o backup
   - ⚠️ Só para emergências

3. **Prevent instead of cure**: Testar migrations em staging primeiro

## Deployment Checklist

### Pre-Deployment

- [ ] Testes passaram no CI (unit, integration, e2e)
- [ ] Code review aprovado
- [ ] Migration validada em staging
- [ ] Backward-compatibility confirmada
- [ ] Health check endpoint funcional
- [ ] Monitoring dashboards abertos

### During Deployment

- [ ] GitHub Actions workflow iniciado
- [ ] Build completou com sucesso
- [ ] Migration executou sem erros
- [ ] Cloud Run deployment iniciou
- [ ] Health checks passaram (nova revisão)
- [ ] Tráfego migrou gradualmente

### Post-Deployment

- [ ] Health check produção (200 OK)
- [ ] Métricas normais:
  - [ ] Event write latency <10ms
  - [ ] Projection lag <1s
  - [ ] API p95 <100ms
  - [ ] Error rate <1%
- [ ] Logs sem errors críticos (5 min)
- [ ] Notificação Slack enviada

### Rollback Triggers

Fazer rollback imediatamente se:
- ❌ Health checks falhando
- ❌ Error rate >5% por 2 minutos
- ❌ Event write latency >50ms
- ❌ Projection lag >5 segundos

## Rollback Procedures

### API Rollback (Cloud Run)

**Instant rollback** para revisão anterior:

```bash
# 1. Listar revisões
gcloud run revisions list --service healz-api --region southamerica-east1

# Output:
# ✔  healz-api-00043  2024-01-30 14:30  100%  (atual - problemática)
# ✔  healz-api-00042  2024-01-30 12:00    0%  (anterior - estável)

# 2. Reverter tráfego
gcloud run services update-traffic healz-api \
  --to-revisions healz-api-00042=100 \
  --region southamerica-east1

# 3. Validar
curl https://api.healz.com.br/health
```

**Tempo**: ~30 segundos

### Database Rollback

**Opção 1: Forward-Fix** (recomendado)
```bash
# Criar migration compensatória
pnpm drizzle-kit generate:pg

# Deploy hotfix
git add drizzle/migrations/
git commit -m "fix: revert problematic migration"
git push origin hotfix/revert-migration

# CI/CD vai deployar automaticamente
```

**Opção 2: Point-in-Time Recovery** (emergência)
```bash
# Restaurar para timestamp antes do problema
gcloud sql backups restore \
  --backup-instance=healz-postgres-prod \
  --backup-id=XXXX \
  --target-instance=healz-postgres-prod

# ⚠️ ATENÇÃO: Isso DESTRÓI dados recentes!
```

### Frontend Rollback

**Reverter arquivos no Cloud Storage**:

```bash
# 1. Listar versões do bucket (se versioning habilitado)
gsutil ls -a gs://healz-web-prod/index.html

# 2. Restaurar versão anterior
gsutil cp gs://healz-web-prod/index.html#VERSION \
  gs://healz-web-prod/index.html

# 3. Invalidar CDN
gcloud compute url-maps invalidate-cdn-cache healz-lb \
  --path "/*"
```

**Tempo**: ~2 minutos (CDN propagation)

## Deployment Environments

### Production Only (MVP)

**Estratégia inicial**: Ambiente único para economizar custos.

**Mitigação de riscos**:
- ✅ CI/CD robusto (testes automáticos)
- ✅ Canary deployments para mudanças críticas
- ✅ Rollback rápido (<2 min)
- ✅ Feature flags (LaunchDarkly - fase 2)

### Future: Staging Environment

**Quando adicionar** (Budget >$300/mês):

```
Development (local)
  ↓
Staging (healz-staging project)
  ↓ (manual approval)
Production (healz-prod project)
```

**Benefícios**:
- ✅ Testar migrations em ambiente real
- ✅ QA testing antes de produção
- ✅ Demo environment

## Blue-Green Deployment (Future)

**Quando usar**: Para mudanças de infraestrutura grandes.

**Setup**:
```bash
# 1. Deploy "green" environment (novo)
gcloud run deploy healz-api-green \
  --image=...nova-image

# 2. Testar green environment
curl https://healz-api-green-xxx.run.app/health

# 3. Atualizar Load Balancer (switch traffic)
gcloud compute backend-services update healz-backend \
  --global \
  --backend healz-api-green

# 4. Monitor por 30 min

# 5a. Se OK: Delete blue environment
gcloud run services delete healz-api-blue

# 5b. Se falhar: Switch back to blue
```

## Database Backup Strategy

### Automated Backups (Cloud SQL)

**Configuração**:
```hcl
backup_configuration {
  enabled                        = true
  start_time                     = "03:00"  # 3 AM Brasília
  point_in_time_recovery_enabled = true
  transaction_log_retention_days = 7

  backup_retention_settings {
    retained_backups = 7  # Mantém 7 backups diários
    retention_unit   = "COUNT"
  }
}
```

**Schedule**:
- Diário: 3 AM (baixo tráfego)
- Retention: 7 dias
- PITR: Últimos 7 dias

### Manual Backup (Pre-Deploy)

**Antes de deploy com migration crítica**:

```bash
# Backup manual
gcloud sql backups create \
  --instance=healz-postgres-prod \
  --description="Pre-deploy backup for migration 005"

# Anotar backup ID
BACKUP_ID=$(gcloud sql backups list \
  --instance=healz-postgres-prod \
  --limit=1 \
  --format="value(id)")

echo "Backup ID: $BACKUP_ID"
```

### Backup Testing

**Validar backups mensalmente**:

```bash
# Restaurar em instância temporária
gcloud sql instances clone healz-postgres-prod \
  healz-postgres-test-restore

# Validar dados
psql -h <instance-ip> -U healz -d healz -c "SELECT COUNT(*) FROM events;"

# Deletar após validação
gcloud sql instances delete healz-postgres-test-restore
```

## Monitoring During Deployment

### Key Metrics

**Monitorar durante deploy**:

```
Event Store:
- event_write_latency_ms (deve permanecer <10ms)
- event_write_errors (deve ser 0)

API:
- http_error_rate (deve permanecer <1%)
- http_request_duration_p95 (deve permanecer <100ms)

Projections:
- projection_lag_seconds (pode subir temporariamente, mas <5s)

Business:
- whatsapp_message_failures (critical)
```

### Alerting

**Alerts durante deploy** (temporariamente mais sensíveis):

```yaml
# Alerta temporário (5 min após deploy)
- name: "Post-Deploy Error Rate"
  condition: error_rate > 3%  # Mais sensível que normal (5%)
  duration: 2 minutes
  action: Rollback automaticamente
```

## Disaster Recovery

### RTO/RPO Targets

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|---------------------|-----------------|
| Bad deployment | 2 minutos | 0 (rollback) |
| Database corruption | 30 minutos | 7 dias (PITR) |
| Regional outage | 2 horas | 1 hora (backup) |
| Complete disaster | 4 horas | 24 horas |

### DR Plan

**1. Bad Deployment**
- Rollback Cloud Run (30s)
- Rollback database (forward-fix ou PITR)

**2. Database Corruption**
- Restore from PITR
- Replay events se necessário

**3. Regional Outage (southamerica-east1 down)**
- Failover para us-east1 (manual)
- Restore database from backup
- Update DNS

## Security During Deployment

### Secrets Rotation

**Nunca** commitar secrets no código:

```bash
# ❌ ERRADO
DATABASE_URL=postgresql://user:password@host/db

# ✅ CORRETO
gcloud secrets create database-url --data-file=-
# Então usar secret no Cloud Run
```

### Least Privilege

Service account de deploy tem APENAS:
- Cloud Run Admin
- Cloud Build Editor
- Secret Manager Accessor

**NÃO** tem:
- Project Owner
- Compute Admin
- Storage Admin (além do bucket específico)

## Próximos Passos

- [**MONITORING.md**](./MONITORING.md) - Observabilidade
- [**SECURITY.md**](./SECURITY.md) - Segurança e LGPD
- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Terraform IaC
