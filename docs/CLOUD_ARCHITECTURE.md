# Cloud Architecture - GCP

## Visão Geral

Arquitetura cloud do Healz no Google Cloud Platform (GCP), otimizada para Event Sourcing + CQRS com orçamento inicial de ~$180/mês.

## Arquitetura Simplificada

```
Internet (Usuários: Clínicas + Pacientes via WhatsApp)
  ↓
Cloud Load Balancer (Global HTTPS LB)
  ├─→ Cloud CDN → Cloud Storage (React SPA Frontend)
  │
  └─→ Cloud Run (NestJS API)
       ├─→ Cloud SQL PostgreSQL (Event Store + Projections)
       ├─→ Memorystore Redis (BullMQ)
       ├─→ Secret Manager (Credentials)
       └─→ Compute Engine (Evolution API - WhatsApp)

Monitoring & Logging:
  - Cloud Logging (Structured logs)
  - Cloud Monitoring (Metrics + dashboards)
  - Cloud Trace (Distributed tracing)
  - Error Reporting

CI/CD:
  - GitHub Actions (Orchestration)
  - Cloud Build (Docker image builds)
  - Artifact Registry (Container images)
```

## Componentes Detalhados

### 1. Frontend: Cloud Storage + CDN

#### Serviço
**Cloud Storage** (static hosting) + **Cloud Load Balancer** + **Cloud CDN**

#### Justificativa
- ✅ React SPA = arquivos estáticos, perfeito para Cloud Storage
- ✅ CDN global para baixa latência
- ✅ HTTPS automático (Google-managed certificate)
- ✅ Extremamente econômico ($0.026/GB storage, $0.08/GB egress)
- ✅ Escala automaticamente para milhões de requests

#### Configuração

**Terraform**:
```hcl
resource "google_storage_bucket" "healz_web" {
  name     = "healz-web-prod"
  location = "southamerica-east1"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"  # SPA routing
  }

  cors {
    origin          = ["https://app.healz.com.br"]
    method          = ["GET"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Public access
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.healz_web.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Load Balancer + CDN
resource "google_compute_backend_bucket" "healz_web_backend" {
  name        = "healz-web-backend"
  bucket_name = google_storage_bucket.healz_web.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    max_ttl           = 86400
    client_ttl        = 3600
    negative_caching  = true
  }
}
```

**Deploy**:
```bash
# Build
cd apps/web
pnpm build

# Upload (rsync para deletar arquivos removidos)
gsutil -m rsync -r -d dist/ gs://healz-web-prod

# Invalidate CDN cache
gcloud compute url-maps invalidate-cdn-cache healz-lb \
  --path "/*" --async
```

**Custo**: ~$5/mês (100GB egress)

---

### 2. API: Cloud Run

#### Serviço
**Cloud Run** (fully managed serverless container)

#### Justificativa
- ✅ **Serverless**: Pay-per-request (vs GKE sempre rodando)
- ✅ **Auto-scaling**: 0 to 1000s de instâncias automaticamente
- ✅ **Stateless**: Perfeito para Event Sourcing (sem session affinity)
- ✅ **Fast cold starts**: Node.js inicia em <1s
- ✅ **Simples**: Sem cluster management
- ✅ **Econômico**: Muito mais barato que GKE para carga variável

#### Configuração

**Especificações**:
```yaml
CPU: 1 vCPU
Memory: 1Gi
Min instances: 0  # Scale to zero (economiza $)
Max instances: 10  # Hard limit (protege budget)
Concurrency: 80  # Requests simultâneos por instância
Timeout: 300s  # 5 minutos
```

**Terraform**:
```hcl
resource "google_cloud_run_service" "healz_api" {
  name     = "healz-api"
  location = "southamerica-east1"

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/cpu-throttling" = "false"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }

    spec {
      container_concurrency = 80
      timeout_seconds       = 300
      service_account_name  = google_service_account.healz_api_sa.email

      containers {
        image = "southamerica-east1-docker.pkg.dev/healz-prod/healz/api:latest"

        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "1Gi"
          }
        }

        env {
          name  = "NODE_ENV"
          value = "production"
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

        env {
          name = "REDIS_URL"
          value_from {
            secret_key_ref {
              name = "redis-url"
              key  = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# VPC Connector (acesso a Cloud SQL via VPC privado)
resource "google_vpc_access_connector" "healz_connector" {
  name          = "healz-vpc-connector"
  region        = "southamerica-east1"
  network       = google_compute_network.healz_vpc.name
  ip_cidr_range = "10.8.0.0/28"
}
```

**Deploy**:
```bash
# Cloud Build cria image
gcloud builds submit --config=cloudbuild.yaml

# Deploy
gcloud run deploy healz-api \
  --image southamerica-east1-docker.pkg.dev/healz-prod/healz/api:latest \
  --platform managed \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --vpc-connector healz-vpc-connector \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 300s \
  --concurrency 80
```

**Custo estimado**:
- Min instances = 0: $0 quando idle
- 1M requests/mês: ~$20-30/mês
- Budget-friendly para MVP

---

### 3. Database: Cloud SQL PostgreSQL

#### Serviço
**Cloud SQL for PostgreSQL 15**

#### Justificativa
- ✅ **Managed**: Backups automáticos, HA, patches, PITR
- ✅ **pgvector support**: PostgreSQL 15+ tem extensão vector
- ✅ **Performance**: Até 96 vCPUs, 624 GB RAM (escalável)
- ✅ **LGPD compliance**: Dados ficam em `southamerica-east1` (Brasil)
- ✅ **Point-in-Time Recovery**: Crítico para Event Store
- ✅ **Read Replicas**: Offload queries de projections (fase 2)

#### Configuração Budget

**Tier inicial**: `db-f1-micro`
- 0.6 vCPU (shared)
- 1.7 GB RAM
- Adequado para MVP (centenas de usuários)

**Terraform**:
```hcl
resource "google_sql_database_instance" "healz_postgres" {
  name             = "healz-postgres-prod"
  database_version = "POSTGRES_15"
  region           = "southamerica-east1"

  settings {
    tier = "db-f1-micro"  # Budget tier

    # Sem HA para economizar (adicionar depois)
    availability_type = "ZONAL"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"  # 3 AM Brasília
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7  # Mantém 7 backups
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false  # Sem IP público
      private_network = google_compute_network.healz_vpc.id
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"  # Ajustado para f1-micro
    }

    database_flags {
      name  = "shared_buffers"
      value = "256MB"  # ~25% da RAM
    }

    maintenance_window {
      day  = 7  # Domingo
      hour = 3  # 3 AM
    }
  }

  deletion_protection = true
}

# Database
resource "google_sql_database" "healz_db" {
  name     = "healz"
  instance = google_sql_database_instance.healz_postgres.name
}

# User
resource "google_sql_user" "healz_user" {
  name     = "healz"
  instance = google_sql_database_instance.healz_postgres.name
  password = random_password.db_password.result
}
```

**Extensions**:
```sql
-- Habilitar pgvector (AI embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID para event IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Connection Pooling**:
- Cloud Run → Cloud SQL Proxy (built-in)
- Application: Drizzle connection pool (max: 20, min: 5)

**Custo**: ~$45/mês (db-f1-micro)

**Upgrade path**:
- **$300/mês budget**: `db-custom-2-7680` (2 vCPU, 8GB) + HA
- **$500/mês budget**: `db-custom-4-16384` (4 vCPU, 16GB) + read replica

---

### 4. Redis: Memorystore

#### Serviço
**Memorystore for Redis 7.0**

#### Justificativa
- ✅ **Managed**: Sem overhead operacional
- ✅ **HA**: Failover automático (tier Standard)
- ✅ **Sub-millisecond latency**: Perfeito para BullMQ
- ✅ **VPC native**: Conexão privada segura
- ✅ **Persistence**: RDB snapshots para durabilidade

#### Configuração Budget

**Tier**: `BASIC` (sem HA)
**Memory**: 1GB

**Terraform**:
```hcl
resource "google_redis_instance" "healz_redis" {
  name           = "healz-redis-prod"
  tier           = "BASIC"  # Sem HA (economiza $110/mês)
  memory_size_gb = 1
  region         = "southamerica-east1"
  redis_version  = "REDIS_7_0"

  authorized_network = google_compute_network.healz_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
}
```

**Trade-off**:
- ❌ Sem HA: Se Redis cair, queues param (downtime ~2-5 min)
- ✅ Econômico: $40/mês vs $150/mês (Standard HA)

**Upgrade quando**:
- Produção com SLA crítico → Standard HA
- Muitas queues → Aumentar memory para 5GB

**Custo**: ~$40/mês (1GB Basic)

---

### 5. Evolution API (WhatsApp): Compute Engine

#### Serviço
**Compute Engine** (VM com Container-Optimized OS)

#### Justificativa
- ✅ **Persistent sessions**: Evolution API precisa armazenar sessions WhatsApp
- ✅ **Docker support**: Roda container Evolution API
- ✅ **Self-hosted control**: Flexibilidade total sobre WhatsApp gateway
- ❌ **Não Cloud Run**: Requer filesystem persistente

**Alternativa descartada**: Cloud Run + Cloud Filestore (NFS) → Mais caro ($250/mês)

#### Configuração Budget

**Machine type**: `e2-micro`
- 2 vCPU (shared, burstable)
- 1 GB RAM
- Adequado para Evolution API (low traffic inicial)

**Terraform**:
```hcl
resource "google_compute_instance" "evolution_api" {
  name         = "evolution-api-prod"
  machine_type = "e2-micro"
  zone         = "southamerica-east1-a"

  boot_disk {
    initialize_params {
      image = "cos-cloud/cos-stable"  # Container-Optimized OS
      size  = 20  # GB
      type  = "pd-standard"  # HDD (mais barato)
    }
  }

  # Persistent disk para WhatsApp sessions
  attached_disk {
    source = google_compute_disk.evolution_data.id
  }

  network_interface {
    network = google_compute_network.healz_vpc.name
    access_config {
      # IP público (necessário para receber webhooks do WhatsApp)
    }
  }

  metadata = {
    gce-container-declaration = <<-EOT
      spec:
        containers:
        - name: evolution-api
          image: atendai/evolution-api:latest
          env:
          - name: DATABASE_PROVIDER
            value: postgresql
          - name: DATABASE_URL
            value: ${google_sql_database_instance.healz_postgres.connection_name}
          volumeMounts:
          - name: evolution-data
            mountPath: /evolution/instances
        volumes:
        - name: evolution-data
          hostPath:
            path: /mnt/disks/evolution-data
    EOT
  }

  service_account {
    email  = google_service_account.evolution_sa.email
    scopes = ["cloud-platform"]
  }

  tags = ["evolution-api", "whatsapp"]
}

# Persistent disk
resource "google_compute_disk" "evolution_data" {
  name = "evolution-data"
  type = "pd-standard"  # HDD
  zone = "southamerica-east1-a"
  size = 20  # GB
}
```

**Firewall**:
```hcl
resource "google_compute_firewall" "allow_whatsapp_webhooks" {
  name    = "allow-whatsapp-webhooks"
  network = google_compute_network.healz_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443", "8080"]
  }

  source_ranges = ["0.0.0.0/0"]  # WhatsApp Meta servers
  target_tags   = ["evolution-api"]
}
```

**Custo**: ~$8/mês (e2-micro + 20GB HDD)

**Upgrade quando**:
- Alto volume de mensagens → e2-small ($15/mês)
- Necessidade de HA → 2 instâncias + Load Balancer

---

### 6. Secrets: Secret Manager

#### Serviço
**Secret Manager**

#### Justificativa
- ✅ **Seguro**: Encrypted at rest e in transit
- ✅ **Audit logging**: Quem acessou qual secret
- ✅ **Versioning**: Rotação sem downtime
- ✅ **IAM integration**: Fine-grained access control

#### Secrets Armazenados

```bash
# Database
gcloud secrets create database-url \
  --replication-policy="user-managed" \
  --locations="southamerica-east1"

# Redis
gcloud secrets create redis-url

# Auth0
gcloud secrets create auth0-client-secret

# OpenAI
gcloud secrets create openai-api-key

# WhatsApp
gcloud secrets create whatsapp-webhook-secret
```

#### Acesso via Cloud Run

**Terraform**:
```hcl
resource "google_cloud_run_service" "healz_api" {
  # ...

  template {
    spec {
      containers {
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

# IAM permission
resource "google_secret_manager_secret_iam_member" "healz_api_access" {
  secret_id = "database-url"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.healz_api_sa.email}"
}
```

**Custo**: ~$1/mês (10 secrets, 1K accesses)

---

### 7. Monitoring: Cloud Logging + Monitoring

#### Serviços
- **Cloud Logging**: Logs centralizados
- **Cloud Monitoring**: Métricas e dashboards
- **Cloud Trace**: Distributed tracing
- **Error Reporting**: Agregação de exceptions

#### Configuração Budget

**Log retention**: 30 dias (WARNING+), 7 dias (INFO)
**Metrics**: Custom metrics + default Cloud Run metrics
**Traces**: Sample 10% de requests (reduz custo)

**Custo**: ~$20/mês (50GB logs)

Detalhes completos em [MONITORING.md](./MONITORING.md).

---

## Networking

### VPC Privado

**Terraform**:
```hcl
resource "google_compute_network" "healz_vpc" {
  name                    = "healz-vpc-prod"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "healz_private_subnet" {
  name          = "healz-private-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = "southamerica-east1"
  network       = google_compute_network.healz_vpc.id

  private_ip_google_access = true
}

# Firewall: Deny all por padrão
resource "google_compute_firewall" "deny_all" {
  name    = "deny-all"
  network = google_compute_network.healz_vpc.name

  deny {
    protocol = "all"
  }

  priority = 65534
}

# Allow: Cloud Run → Cloud SQL
resource "google_compute_firewall" "allow_cloud_run_to_sql" {
  name    = "allow-cloud-run-to-sql"
  network = google_compute_network.healz_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = ["10.8.0.0/28"]  # VPC Connector
  target_tags   = ["cloud-sql"]
  priority      = 1000
}
```

---

## Custo Total Budget

| Componente | Config | $/mês |
|------------|--------|-------|
| Cloud Run (API) | min=0, max=10 | $20 |
| Cloud SQL | db-f1-micro | $45 |
| Memorystore | 1GB Basic | $40 |
| Compute Engine (Evolution) | e2-micro | $8 |
| Cloud Storage (frontend) | 10GB + CDN | $5 |
| Secret Manager | 10 secrets | $1 |
| Monitoring | 50GB logs | $20 |
| Networking | VPC + LB | $15 |
| Cloud Build | 50 builds | $5 |
| **TOTAL** | | **~$159/mês** |

**Margem**: ~$40/mês para spikes de tráfego.

---

## Região: southamerica-east1

**Localização**: São Paulo, Brasil

**Justificativa**:
- ✅ **LGPD compliance**: Dados ficam no Brasil
- ✅ **Latência**: ~20ms para usuários brasileiros
- ✅ **Todos os serviços disponíveis**: Cloud Run, Cloud SQL, Memorystore

---

## Próximos Passos

- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Terraform modules detalhados
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Strategy de deploy
- [**MONITORING.md**](./MONITORING.md) - Métricas e alertas
- [**SECURITY.md**](./SECURITY.md) - Network security e LGPD
