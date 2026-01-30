# Security & LGPD Compliance

## Visão Geral

Estratégia de segurança para Healz cobrindo **network security**, **data encryption**, **IAM**, **audit logging** e **compliance LGPD**.

## LGPD Compliance

### Requisitos Legais

**LGPD** (Lei Geral de Proteção de Dados) - Lei 13.709/2018

**Aplicável a Healz porque**:
- Processa dados pessoais de pacientes brasileiros
- Dados sensíveis de saúde (categoria especial)
- Operação no Brasil

### Data Residency

**Requisito**: Dados devem permanecer no Brasil (Art. 33, LGPD).

**Implementação**:
- ✅ Região GCP: `southamerica-east1` (São Paulo)
- ✅ Cloud SQL: Data stays in BR
- ✅ Backups: Mesma região
- ✅ Logs: Cloud Logging (BR)

**Terraform enforcement**:
```hcl
# Garantir que recursos ficam no Brasil
locals {
  allowed_regions = ["southamerica-east1"]
}

resource "google_sql_database_instance" "healz_postgres" {
  region = "southamerica-east1"  # BR only

  settings {
    # Prevent cross-region replication
    backup_configuration {
      location = "southamerica-east1"
    }
  }
}

# Validação
resource "null_resource" "validate_region" {
  provisioner "local-exec" {
    command = <<-EOT
      if [[ "${google_sql_database_instance.healz_postgres.region}" != "southamerica-east1" ]]; then
        echo "ERROR: Database must be in southamerica-east1 for LGPD compliance"
        exit 1
      fi
    EOT
  }
}
```

### Right to Erasure (Direito ao Esquecimento)

**Desafio**: Event Store é imutável, mas LGPD exige deletar dados.

**Solução**: **Cryptographic Erasure** (deletar chave de encriptação).

#### Implementação

**1. Encrypt PII com chaves por paciente**:

```typescript
// apps/api/src/encryption/patient-pii-encryption.ts
import { KeyManagementServiceClient } from '@google-cloud/kms';

export class PatientPIIEncryption {
  private kms = new KeyManagementServiceClient();
  private keyRing = 'projects/healz-prod/locations/southamerica-east1/keyRings/healz-keyring';

  /**
   * Encripta dados sensíveis do paciente com DEK (Data Encryption Key) único
   */
  async encryptPII(patientId: string, data: any): Promise<string> {
    // 1. Gerar DEK único para este paciente (ou recuperar se já existe)
    const dek = await this.getOrCreateDEK(patientId);

    // 2. Encriptar dados com DEK
    const encrypted = this.encryptWithDEK(JSON.stringify(data), dek);

    return encrypted;
  }

  /**
   * Descriptografa dados do paciente
   */
  async decryptPII(patientId: string, encryptedData: string): Promise<any> {
    // 1. Recuperar DEK do paciente
    const dek = await this.getDEK(patientId);

    if (!dek) {
      throw new Error('Patient data key not found (may have been erased)');
    }

    // 2. Descriptografar dados
    const decrypted = this.decryptWithDEK(encryptedData, dek);

    return JSON.parse(decrypted);
  }

  /**
   * DIREITO AO ESQUECIMENTO: Deleta chave do paciente
   * Torna todos os dados do paciente irrecuperáveis
   */
  async erasePatient(patientId: string): Promise<void> {
    // Deletar DEK do banco de dados
    await this.db.delete(patientEncryptionKeys)
      .where(eq(patientEncryptionKeys.patientId, patientId));

    // Log para compliance
    await this.auditLog({
      action: 'PATIENT_DATA_ERASED',
      patient_id: patientId,
      timestamp: new Date(),
      reason: 'LGPD Right to Erasure (Art. 18)'
    });
  }

  private async getOrCreateDEK(patientId: string): Promise<string> {
    // Check if DEK exists
    const existing = await this.db.query.patientEncryptionKeys.findFirst({
      where: eq(patientEncryptionKeys.patientId, patientId)
    });

    if (existing) {
      // Decrypt wrapped DEK using KMS KEK
      const [result] = await this.kms.decrypt({
        name: `${this.keyRing}/cryptoKeys/patient-data-key`,
        ciphertext: Buffer.from(existing.wrappedDek, 'base64')
      });

      return result.plaintext.toString('base64');
    }

    // Generate new DEK
    const dek = crypto.randomBytes(32).toString('base64');

    // Wrap DEK with KMS KEK (Key Encryption Key)
    const [wrapResult] = await this.kms.encrypt({
      name: `${this.keyRing}/cryptoKeys/patient-data-key`,
      plaintext: Buffer.from(dek, 'base64')
    });

    // Store wrapped DEK
    await this.db.insert(patientEncryptionKeys).values({
      patientId,
      wrappedDek: Buffer.from(wrapResult.ciphertext).toString('base64'),
      createdAt: new Date()
    });

    return dek;
  }

  private getDEK(patientId: string): Promise<string | null> {
    // Similar to getOrCreateDEK, but returns null if not found
  }

  private encryptWithDEK(data: string, dek: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(dek, 'base64'), iv);

    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('base64'),
      encrypted,
      authTag: authTag.toString('base64')
    });
  }

  private decryptWithDEK(encryptedData: string, dek: string): string {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(dek, 'base64'),
      Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

**2. Usar encriptação ao armazenar eventos**:

```typescript
// No Aggregate: Patient
async registerPatient(command: RegisterPatientCommand) {
  const encryptedPhone = await this.encryption.encryptPII(
    command.patientId,
    { phone: command.phone }
  );

  const encryptedEmail = await this.encryption.encryptPII(
    command.patientId,
    { email: command.email }
  );

  const event: PatientRegisteredEvent = {
    event_type: 'PatientRegistered',
    event_data: {
      patient_id: command.patientId,
      phone: encryptedPhone,           // ✅ Encrypted
      email: encryptedEmail,           // ✅ Encrypted
      full_name: encryptedFullName,    // ✅ Encrypted
      birth_date: encryptedBirthDate   // ✅ Encrypted
    }
  };

  await this.eventStore.append(event);
}
```

**3. Implementar endpoint de erasure**:

```typescript
// apps/api/src/modules/patients/controllers/patient-erasure.controller.ts
@Controller('patients')
export class PatientErasureController {
  @Delete(':id/erase')
  @RequirePermission('patient:erase')
  async erasePatient(@Param('id') patientId: string) {
    // 1. Validar permissão (só titular ou DPO pode solicitar)
    await this.validateErasureRequest(patientId);

    // 2. Deletar DEK (torna dados irrecuperáveis)
    await this.encryption.erasePatient(patientId);

    // 3. Marcar paciente como "erased" (soft delete)
    await this.db.update(patients)
      .set({
        status: 'ERASED',
        erased_at: new Date(),
        erased_by: this.currentUser.id
      })
      .where(eq(patients.id, patientId));

    // 4. Log para compliance
    await this.auditLog({
      action: 'PATIENT_ERASED',
      patient_id: patientId,
      performed_by: this.currentUser.id,
      reason: 'LGPD Art. 18 - Right to Erasure',
      timestamp: new Date()
    });

    return {
      message: 'Patient data successfully erased',
      patient_id: patientId,
      erased_at: new Date()
    };
  }
}
```

**Resultado**: Eventos permanecem no Event Store, mas dados sensíveis são irrecuperáveis.

### Data Classification

| Tipo de Dado | Sensibilidade | Encriptação | Retenção | Erasure |
|--------------|---------------|-------------|----------|---------|
| **Nome, CPF, telefone** | Alta (PII) | ✅ DEK por paciente | Até erasure | ✅ Deletar DEK |
| **Dados de saúde** | Crítica | ✅ DEK por paciente | Até erasure | ✅ Deletar DEK |
| **Metadados (IDs, timestamps)** | Baixa | ❌ Não | Permanente | ❌ Manter |
| **Logs de sistema** | Média | ✅ Pseudonimização | 90 dias | ✅ Auto-delete |

### Consent Management

```typescript
// Tabela de consentimentos
export const patientConsents = pgTable('patient_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => patients.id).notNull(),
  consentType: varchar('consent_type', { length: 50 }).notNull(), // 'data_processing', 'marketing', etc
  granted: boolean('granted').notNull(),
  grantedAt: timestamp('granted_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  purpose: text('purpose').notNull() // "Processamento de dados para agendamento de consultas"
});
```

**Validar consentimento antes de processar**:
```typescript
async processPatientData(patientId: string) {
  // Verificar consentimento
  const consent = await this.db.query.patientConsents.findFirst({
    where: and(
      eq(patientConsents.patientId, patientId),
      eq(patientConsents.consentType, 'data_processing'),
      eq(patientConsents.granted, true),
      isNull(patientConsents.revokedAt)
    )
  });

  if (!consent) {
    throw new UnauthorizedException('Patient has not granted consent for data processing');
  }

  // Continuar processamento...
}
```

## Network Security

### VPC Privado

**Princípio**: Isolar recursos em rede privada.

```hcl
# VPC privado
resource "google_compute_network" "healz_vpc" {
  name                    = "healz-vpc-prod"
  auto_create_subnetworks = false
}

# Subnet privada
resource "google_compute_subnetwork" "healz_private_subnet" {
  name          = "healz-private-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = "southamerica-east1"
  network       = google_compute_network.healz_vpc.id

  # Acesso a Google APIs via Private Google Access
  private_ip_google_access = true
}
```

### Firewall Rules

**Default: Deny All**

```hcl
# Regra padrão: Negar tudo
resource "google_compute_firewall" "deny_all" {
  name     = "deny-all"
  network  = google_compute_network.healz_vpc.name
  priority = 65534  # Lowest priority

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

# Permitir: Cloud Run → Cloud SQL
resource "google_compute_firewall" "allow_cloud_run_to_sql" {
  name     = "allow-cloud-run-to-sql"
  network  = google_compute_network.healz_vpc.name
  priority = 1000

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = ["10.8.0.0/28"]  # VPC Connector range
  target_tags   = ["cloud-sql"]
}

# Permitir: Cloud Run → Memorystore (Redis)
resource "google_compute_firewall" "allow_cloud_run_to_redis" {
  name     = "allow-cloud-run-to-redis"
  network  = google_compute_network.healz_vpc.name
  priority = 1000

  allow {
    protocol = "tcp"
    ports    = ["6379"]
  }

  source_ranges = ["10.8.0.0/28"]
  target_tags   = ["redis"]
}

# Permitir: Health checks (Load Balancer)
resource "google_compute_firewall" "allow_health_checks" {
  name     = "allow-health-checks"
  network  = google_compute_network.healz_vpc.name
  priority = 1000

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_ranges = [
    "35.191.0.0/16",  # Google health check ranges
    "130.211.0.0/22"
  ]
}
```

### Cloud SQL: Private IP Only

```hcl
resource "google_sql_database_instance" "healz_postgres" {
  # ...

  settings {
    ip_configuration {
      ipv4_enabled    = false  # ✅ Sem IP público
      private_network = google_compute_network.healz_vpc.id
      require_ssl     = true   # ✅ TLS obrigatório
    }
  }
}
```

### TLS Everywhere

- ✅ Cloud Load Balancer: TLS 1.3 (Google-managed certificate)
- ✅ Cloud SQL: SSL/TLS required
- ✅ Memorystore: TLS in transit (REDIS_TLS mode)
- ✅ Evolution API: HTTPS webhooks

## IAM (Identity & Access Management)

### Principle of Least Privilege

**Service Accounts** com permissões mínimas:

#### Cloud Run API Service Account

```hcl
resource "google_service_account" "healz_api_sa" {
  account_id   = "healz-api"
  display_name = "Healz API Service Account"
}

# Cloud SQL Client (acesso ao banco)
resource "google_project_iam_member" "api_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.healz_api_sa.email}"
}

# Secret Manager Accessor (ler secrets)
resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.healz_api_sa.email}"
}

# Cloud Logging Writer (escrever logs)
resource "google_project_iam_member" "api_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.healz_api_sa.email}"
}

# Cloud Monitoring Metric Writer
resource "google_project_iam_member" "api_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.healz_api_sa.email}"
}
```

**NÃO tem**:
- ❌ `roles/owner`
- ❌ `roles/editor`
- ❌ `roles/compute.admin`
- ❌ Acesso a outros projetos

#### GitHub Actions Service Account

```hcl
resource "google_service_account" "github_actions_sa" {
  account_id   = "github-actions"
  display_name = "GitHub Actions CI/CD"
}

# Cloud Run Admin (deploy)
resource "google_project_iam_member" "github_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# Cloud Build Editor (criar builds)
resource "google_project_iam_member" "github_build_editor" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# Artifact Registry Writer (push images)
resource "google_project_iam_member" "github_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

# Service Account User (impersonate outras SAs)
resource "google_service_account_iam_member" "github_sa_user" {
  service_account_id = google_service_account.healz_api_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions_sa.email}"
}
```

### Workload Identity (futuro: GKE)

Se migrar para GKE:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: healz-api-sa
  annotations:
    iam.gke.io/gcp-service-account: healz-api@healz-prod.iam.gserviceaccount.com
```

## Secrets Management

### Secret Manager

**Todos os secrets em Secret Manager** (nunca no código):

```bash
# Database URL
echo -n "postgresql://user:password@host/db" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
echo -n "redis://host:6379" | \
  gcloud secrets create redis-url --data-file=-

# OpenAI API Key
echo -n "sk-..." | \
  gcloud secrets create openai-api-key --data-file=-
```

**Acesso via IAM**:
```hcl
resource "google_secret_manager_secret_iam_member" "api_access_db_secret" {
  secret_id = "database-url"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.healz_api_sa.email}"
}
```

### Secret Rotation

**Rotação automática de database password**:

```bash
# 1. Criar novo password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Criar novo usuário no PostgreSQL
gcloud sql users create healz_v2 \
  --instance=healz-postgres-prod \
  --password=$NEW_PASSWORD

# 3. Atualizar secret (nova versão)
echo -n "postgresql://healz_v2:$NEW_PASSWORD@host/db" | \
  gcloud secrets versions add database-url --data-file=-

# 4. Cloud Run usa automaticamente a latest version
# (deploy não necessário, pega nova versão no próximo restart)

# 5. Após validar: deletar usuário antigo
gcloud sql users delete healz --instance=healz-postgres-prod
```

## Audit Logging

### Cloud Audit Logs

**Habilitar todos os tipos**:

```hcl
resource "google_project_iam_audit_config" "healz_audit" {
  project = var.project_id
  service = "allServices"

  # Admin activity (mudanças de config)
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Data access (leitura de dados)
  audit_log_config {
    log_type = "DATA_READ"
  }

  # Data writes (escrita de dados)
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
```

### Application-Level Audit Log

**Toda ação sensível deve ser logada**:

```typescript
// apps/api/src/audit/audit-logger.ts
export async function auditPatientAccess(
  userId: string,
  patientId: string,
  action: string,
  details?: Record<string, any>
) {
  await logger.info('Patient data accessed', {
    audit_type: 'PATIENT_ACCESS',
    user_id: userId,
    patient_id: patientId,
    action,  // 'view', 'update', 'erase', etc
    details,
    timestamp: new Date().toISOString(),
    ip_address: request.ip,
    user_agent: request.headers['user-agent']
  });

  // Também salvar em tabela dedicada (compliance)
  await db.insert(auditLogs).values({
    userId,
    resourceType: 'patient',
    resourceId: patientId,
    action,
    details,
    ipAddress: request.ip,
    createdAt: new Date()
  });
}
```

**Usar em controllers**:
```typescript
@Get('patients/:id')
async getPatient(@Param('id') id: string) {
  await auditPatientAccess(this.currentUser.id, id, 'view');

  const patient = await this.patientService.findById(id);
  return patient;
}
```

## Penetration Testing

### Checklist de Segurança

- [ ] SQL Injection: ✅ Prevenido (Drizzle ORM parametrizado)
- [ ] XSS: ✅ React escapa automaticamente
- [ ] CSRF: ✅ SameSite cookies + CORS configurado
- [ ] Authentication: ✅ Auth0/Clerk JWT
- [ ] Authorization: ✅ RBAC com guards
- [ ] Secrets exposure: ✅ Secret Manager
- [ ] Man-in-the-middle: ✅ TLS everywhere
- [ ] DDoS: ✅ Cloud Armor (opcional)

### Security Headers

```typescript
// apps/api/src/main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Incident Response

### Security Incident Runbook

**1. Detect**:
- Alert via Cloud Monitoring
- Logs anômalos (Cloud Logging)

**2. Contain**:
```bash
# Desabilitar service account comprometido
gcloud iam service-accounts disable healz-api@healz-prod.iam.gserviceaccount.com

# Block IP address
gcloud compute firewall-rules create block-attacker \
  --action deny \
  --rules all \
  --source-ranges 1.2.3.4/32 \
  --priority 100
```

**3. Investigate**:
```bash
# Audit logs
gcloud logging read 'protoPayload.authenticationInfo.principalEmail="attacker@example.com"' \
  --limit 1000 \
  --format json > incident-logs.json
```

**4. Remediate**:
- Rotacionar secrets
- Patch vulnerabilidade
- Restore from backup (se necessário)

**5. Document**:
- Incident report
- Notificar ANPD (se data breach)
- Notificar titulares (se necessário)

## Próximos Passos

- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Terraform IaC completo
