# Infrastructure as Code (Terraform)

## Visão Geral

Toda a infraestrutura Healz no GCP é gerenciada via **Terraform**, permitindo infraestrutura versionada, reproduzível e auditável.

## Estrutura de Diretórios

```
infra/terraform/
├── environments/
│   └── production/
│       ├── main.tf              # Entry point
│       ├── terraform.tfvars     # Variables específicas de prod
│       ├── backend.tf           # State storage config
│       └── outputs.tf           # Outputs importantes
│
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloud-run/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloud-sql/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── memorystore/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── compute-engine/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── monitoring/
│       ├── main.tf
│       ├── dashboards.tf
│       ├── alerts.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── global/
│   ├── iam.tf                   # Service accounts e IAM
│   ├── artifact-registry.tf    # Container registry
│   ├── secret-manager.tf       # Secrets
│   └── dns.tf                   # Cloud DNS (domínio)
│
└── README.md
```

## State Management

### Remote State (Cloud Storage)

**backend.tf**:
```hcl
terraform {
  backend "gcs" {
    bucket = "healz-terraform-state-prod"
    prefix = "terraform/state"
  }
}
```

**Criar state bucket** (one-time setup):
```bash
# Criar bucket
gsutil mb -p healz-prod \
  -c STANDARD \
  -l southamerica-east1 \
  gs://healz-terraform-state-prod

# Habilitar versioning (rollback se necessário)
gsutil versioning set on gs://healz-terraform-state-prod

# Lock (prevenir modificações simultâneas)
# GCS backend usa object metadata para locking (automático)

# Lifecycle policy (manter últimas 10 versões)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {
        "numNewerVersions": 10
      }
    }]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://healz-terraform-state-prod
```

### State Locking

**Automático** com GCS backend (usa object metadata).

Se dois `terraform apply` rodarem simultaneamente:
```
Error: Error acquiring state lock
Lock Info:
  ID:        1234567890
  Path:      healz-terraform-state-prod/terraform/state/default.tflock
  Operation: OperationTypeApply
  Who:       user@example.com
  Created:   2024-01-30 14:30:00 UTC
```

## Environment Configuration

### Production

**infra/terraform/environments/production/main.tf**:
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "gcs" {
    bucket = "healz-terraform-state-prod"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variáveis
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "southamerica-east1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Módulos
module "networking" {
  source = "../../modules/networking"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
  vpc_network = module.networking.vpc_network_id

  tier                = var.db_tier
  availability_type   = var.db_availability_type
  database_version    = "POSTGRES_15"
}

module "memorystore" {
  source = "../../modules/memorystore"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment
  vpc_network = module.networking.vpc_network_id

  memory_size_gb = var.redis_memory_gb
  tier           = var.redis_tier
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  vpc_connector   = module.networking.vpc_connector_id
  service_account = module.iam.cloud_run_service_account

  image          = var.api_image
  min_instances  = var.api_min_instances
  max_instances  = var.api_max_instances
  cpu            = var.api_cpu
  memory         = var.api_memory
}

module "evolution_api" {
  source = "../../modules/compute-engine"

  project_id   = var.project_id
  zone         = "${var.region}-a"
  environment  = var.environment
  vpc_network  = module.networking.vpc_network_id

  machine_type = var.evolution_machine_type
  disk_size_gb = 20
}

module "monitoring" {
  source = "../../modules/monitoring"

  project_id  = var.project_id
  environment = var.environment

  notification_channels = {
    slack     = var.slack_webhook_url
    pagerduty = var.pagerduty_service_key
  }
}

# Outputs
output "api_url" {
  value       = module.cloud_run.service_url
  description = "Cloud Run API URL"
}

output "database_connection_name" {
  value       = module.cloud_sql.connection_name
  description = "Cloud SQL connection name"
  sensitive   = true
}

output "redis_host" {
  value       = module.memorystore.redis_host
  description = "Memorystore Redis host"
  sensitive   = true
}
```

**terraform.tfvars**:
```hcl
project_id  = "healz-prod"
region      = "southamerica-east1"
environment = "production"

# Cloud SQL (Budget tier)
db_tier             = "db-f1-micro"
db_availability_type = "ZONAL"  # Sem HA

# Memorystore (Budget tier)
redis_memory_gb = 1
redis_tier      = "BASIC"  # Sem HA

# Cloud Run
api_image        = "southamerica-east1-docker.pkg.dev/healz-prod/healz/api:latest"
api_min_instances = 0
api_max_instances = 10
api_cpu          = "1"
api_memory       = "1Gi"

# Evolution API
evolution_machine_type = "e2-micro"

# Alerting
slack_webhook_url       = "https://hooks.slack.com/services/..."
pagerduty_service_key   = "..."
```

## Modules

### Networking Module

**infra/terraform/modules/networking/main.tf**:
```hcl
variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }

# VPC
resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

# Subnet
resource "google_compute_subnetwork" "private_subnet" {
  name          = "${var.environment}-private-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  project       = var.project_id

  private_ip_google_access = true
}

# VPC Connector (Cloud Run → VPC)
resource "google_vpc_access_connector" "connector" {
  name          = "${var.environment}-vpc-connector"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  project       = var.project_id
}

# Firewall: Deny all (default)
resource "google_compute_firewall" "deny_all" {
  name     = "${var.environment}-deny-all"
  network  = google_compute_network.vpc.name
  project  = var.project_id
  priority = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

# Firewall: Allow Cloud Run → Cloud SQL
resource "google_compute_firewall" "allow_cloud_run_to_sql" {
  name     = "${var.environment}-allow-cloud-run-to-sql"
  network  = google_compute_network.vpc.name
  project  = var.project_id
  priority = 1000

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = ["10.8.0.0/28"]  # VPC Connector
  target_tags   = ["cloud-sql"]
}

# Firewall: Allow Cloud Run → Redis
resource "google_compute_firewall" "allow_cloud_run_to_redis" {
  name     = "${var.environment}-allow-cloud-run-to-redis"
  network  = google_compute_network.vpc.name
  project  = var.project_id
  priority = 1000

  allow {
    protocol = "tcp"
    ports    = ["6379"]
  }

  source_ranges = ["10.8.0.0/28"]
  target_tags   = ["redis"]
}

# Outputs
output "vpc_network_id" {
  value = google_compute_network.vpc.id
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.connector.id
}
```

### Cloud SQL Module

**infra/terraform/modules/cloud-sql/main.tf**:
```hcl
variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "vpc_network" { type = string }
variable "tier" { type = string }
variable "availability_type" { type = string }
variable "database_version" { type = string }

# Random password
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Cloud SQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "${var.environment}-postgres"
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  settings {
    tier              = var.tier
    availability_type = var.availability_type

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false  # Sem IP público
      private_network = var.vpc_network
      require_ssl     = true
    }

    database_flags {
      name  = "max_connections"
      value = var.tier == "db-f1-micro" ? "100" : "200"
    }

    database_flags {
      name  = "shared_buffers"
      value = var.tier == "db-f1-micro" ? "256MB" : "4GB"
    }

    database_flags {
      name  = "effective_cache_size"
      value = var.tier == "db-f1-micro" ? "512MB" : "12GB"
    }

    maintenance_window {
      day  = 7  # Domingo
      hour = 3  # 3 AM
    }
  }

  deletion_protection = true
}

# Database
resource "google_sql_database" "healz" {
  name     = "healz"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

# User
resource "google_sql_user" "healz" {
  name     = "healz"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
  project  = var.project_id
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.environment}-database-url"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${google_sql_user.healz.name}:${random_password.db_password.result}@/${google_sql_database.healz.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
}

# Outputs
output "connection_name" {
  value     = google_sql_database_instance.postgres.connection_name
  sensitive = true
}

output "database_url_secret_id" {
  value = google_secret_manager_secret.database_url.secret_id
}
```

### Cloud Run Module

**infra/terraform/modules/cloud-run/main.tf**:
```hcl
variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "vpc_connector" { type = string }
variable "service_account" { type = string }
variable "image" { type = string }
variable "min_instances" { type = number }
variable "max_instances" { type = number }
variable "cpu" { type = string }
variable "memory" { type = string }

resource "google_cloud_run_service" "api" {
  name     = "${var.environment}-api"
  location = var.region
  project  = var.project_id

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"         = tostring(var.min_instances)
        "autoscaling.knative.dev/maxScale"         = tostring(var.max_instances)
        "run.googleapis.com/cpu-throttling"        = "false"
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/vpc-access-connector"  = var.vpc_connector
        "run.googleapis.com/vpc-access-egress"     = "private-ranges-only"
      }
    }

    spec {
      container_concurrency = 80
      timeout_seconds       = 300
      service_account_name  = var.service_account

      containers {
        image = var.image

        ports {
          name           = "http1"
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = "${var.environment}-database-url"
              key  = "latest"
            }
          }
        }

        env {
          name = "REDIS_URL"
          value_from {
            secret_key_ref {
              name = "${var.environment}-redis-url"
              key  = "latest"
            }
          }
        }

        # Liveness probe
        liveness_probe {
          http_get {
            path = "/health"
            port = 8080
          }
          initial_delay_seconds = 10
          period_seconds        = 10
          timeout_seconds       = 3
          failure_threshold     = 3
        }

        # Startup probe
        startup_probe {
          http_get {
            path = "/health"
            port = 8080
          }
          initial_delay_seconds = 0
          period_seconds        = 5
          timeout_seconds       = 3
          failure_threshold     = 10
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Allow unauthenticated (API pública)
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Output
output "service_url" {
  value = google_cloud_run_service.api.status[0].url
}
```

### Monitoring Module

**infra/terraform/modules/monitoring/alerts.tf**:
```hcl
variable "project_id" { type = string }
variable "environment" { type = string }
variable "notification_channels" {
  type = object({
    slack     = string
    pagerduty = string
  })
}

# Notification Channels
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Slack ${var.environment}"
  type         = "slack"
  project      = var.project_id

  labels = {
    channel_name = "#healz-alerts"
  }

  sensitive_labels {
    auth_token = var.notification_channels.slack
  }
}

resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty ${var.environment}"
  type         = "pagerduty"
  project      = var.project_id

  sensitive_labels {
    service_key = var.notification_channels.pagerduty
  }
}

# Alert: Event Write Latency
resource "google_monitoring_alert_policy" "event_write_latency" {
  display_name = "[${upper(var.environment)}] Event Write Latency > 50ms"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "Event write p95 > 50ms"

    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/event_write_latency_ms\""
      duration        = "120s"
      comparison      = "COMPARISON_GT"
      threshold_value = 50

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]

  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert: API Error Rate
resource "google_monitoring_alert_policy" "api_error_rate" {
  display_name = "[${upper(var.environment)}] API Error Rate > 5%"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "5xx rate > 5%"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.response_code_class=\"5xx\""
      ])

      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]
}
```

## Global Resources

### IAM

**infra/terraform/global/iam.tf**:
```hcl
# Cloud Run API Service Account
resource "google_service_account" "cloud_run_sa" {
  account_id   = "healz-api"
  display_name = "Healz API Service Account"
  project      = var.project_id
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# GitHub Actions Service Account
resource "google_service_account" "github_actions_sa" {
  account_id   = "github-actions"
  display_name = "GitHub Actions CI/CD"
  project      = var.project_id
}

resource "google_project_iam_member" "github_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

resource "google_project_iam_member" "github_build_editor" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

resource "google_project_iam_member" "github_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}
```

## Workflow

### Initial Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/healz-monorepo
cd healz-monorepo/infra/terraform/environments/production

# 2. Initialize Terraform
terraform init

# 3. Validate configuration
terraform validate

# 4. Plan (preview changes)
terraform plan -out=tfplan

# 5. Review plan
# ... check output ...

# 6. Apply
terraform apply tfplan
```

### Making Changes

```bash
# 1. Edit .tf files
vim main.tf

# 2. Format
terraform fmt -recursive

# 3. Validate
terraform validate

# 4. Plan
terraform plan -out=tfplan

# 5. Apply
terraform apply tfplan
```

### Destroying Resources

```bash
# ⚠️ CUIDADO: Isso deleta TUDO!

# Preview what will be deleted
terraform plan -destroy

# Destroy
terraform destroy

# Ou destruir recurso específico
terraform destroy -target=module.cloud_run
```

## Best Practices

### 1. Never Commit Secrets

```bash
# ❌ ERRADO
variable "database_password" {
  default = "super-secret-password"  # NUNCA FAÇA ISSO
}

# ✅ CORRETO
variable "database_password" {
  type      = string
  sensitive = true
  # Passar via env: TF_VAR_database_password=...
}
```

### 2. Use Remote State

```hcl
# ✅ SEMPRE use remote state
terraform {
  backend "gcs" {
    bucket = "healz-terraform-state-prod"
    prefix = "terraform/state"
  }
}
```

### 3. Use Modules

```hcl
# ✅ Modularize código reutilizável
module "cloud_sql" {
  source = "../../modules/cloud-sql"
  # ...
}
```

### 4. Version Pin

```hcl
# ✅ Pin provider versions
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"  # Major version lock
    }
  }
}
```

### 5. Use Variables

```hcl
# ✅ Parametrize tudo
variable "region" {
  type        = string
  default     = "southamerica-east1"
  description = "GCP Region"
}
```

### 6. Protect State

```bash
# ✅ Lifecycle prevent_destroy para recursos críticos
resource "google_sql_database_instance" "postgres" {
  # ...

  lifecycle {
    prevent_destroy = true
  }
}
```

## Terraform Cloud (Futuro)

Para times maiores, considerar **Terraform Cloud**:

**Benefícios**:
- ✅ Remote execution (não precisa rodar local)
- ✅ VCS integration (auto-plan em PRs)
- ✅ Team collaboration (ACL, approvals)
- ✅ Cost estimation
- ✅ Policy as Code (Sentinel)

**Configuração**:
```hcl
terraform {
  cloud {
    organization = "healz"

    workspaces {
      name = "healz-production"
    }
  }
}
```

## Troubleshooting

### State Lock Stuck

```bash
# Forçar unlock (cuidado!)
terraform force-unlock <LOCK_ID>
```

### Import Existing Resources

```bash
# Importar recurso criado manualmente
terraform import google_cloud_run_service.api \
  projects/healz-prod/locations/southamerica-east1/services/healz-api
```

### Refresh State

```bash
# Atualizar state com realidade do GCP
terraform refresh
```

### Debug

```bash
# Verbose logging
TF_LOG=DEBUG terraform apply
```

## Custo Estimado

| Recurso | Custo/mês |
|---------|-----------|
| Terraform | Grátis |
| State storage (Cloud Storage) | $0.02 |
| **Total** | **~$0.02/mês** |

**Nota**: Terraform é grátis. Você paga apenas pelos recursos que cria.

## Próximos Documentos

- [**DEVOPS_STRATEGY.md**](./DEVOPS_STRATEGY.md) - Visão geral estratégica
- [**CLOUD_ARCHITECTURE.md**](./CLOUD_ARCHITECTURE.md) - Arquitetura GCP
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Estratégia de deployment
