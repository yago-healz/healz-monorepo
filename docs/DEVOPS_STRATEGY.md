# Estratégia DevOps - Healz

## Visão Geral

Este documento define a estratégia completa de DevOps para o projeto Healz, incluindo decisões arquiteturais, escolhas de cloud, CI/CD, monitoramento e caminho de evolução.

## Contexto do Projeto

### Stack Técnico
- **Monorepo**: Turborepo + pnpm
- **Backend**: NestJS + TypeScript
- **Frontend**: React + Vite
- **Database**: PostgreSQL 15 (com pgvector)
- **Queue**: BullMQ + Redis
- **WhatsApp**: Evolution API (self-hosted)
- **AI**: LangChain

### Restrições Iniciais
- **Orçamento**: ~R$ 1.000/mês (~$200 USD)
- **Timeline**: 1-2 meses para MVP
- **Prioridade**: Velocidade de desenvolvimento
- **Cloud**: Google Cloud Platform (GCP)
- **Compliance**: LGPD (dados no Brasil)

## Decisão 1: Arquitetura da API

### Monolito Modular ✅

**Decisão**: Começar com uma única API NestJS com módulos bem definidos por domínio (bounded contexts).

#### Justificativa

**Por que NÃO microservices inicialmente?**

1. **Event Sourcing favorece compartilhamento**: Event Store funciona melhor como fonte de verdade única
2. **CQRS já separa read/write**: Não precisa de microservices para escalar leituras
3. **Time pequeno** (2-5 devs): Compartilhamento de código é vantagem, não desvantagem
4. **Transações multi-agregado**: Mais simples em monolito (Patient + Journey + Appointment)
5. **Migrations mais simples**: Schema único, evolução coordenada
6. **Debugging mais fácil**: Stack traces completos, sem distributed tracing obrigatório
7. **Deploy único**: Menos complexidade operacional
8. **MVP mais rápido**: 4-6 semanas vs 12+ semanas para microservices

**Por que "Modular"?**

O monolito é estruturado em **bounded contexts** independentes que podem ser extraídos no futuro:

```
apps/api/src/modules/
├── patients/          # Domain: Patient Management
│   ├── commands/
│   ├── events/
│   ├── aggregates/
│   ├── projections/
│   └── controllers/
│
├── appointments/      # Domain: Scheduling
│   ├── commands/
│   ├── events/
│   ├── aggregates/
│   ├── projections/
│   └── controllers/
│
├── conversations/     # Domain: Communication
│   ├── commands/
│   ├── events/
│   ├── aggregates/
│   ├── projections/
│   └── controllers/
│
├── journey/          # Domain: Patient Journey
│   ├── commands/
│   ├── events/
│   ├── aggregates/
│   ├── projections/
│   └── controllers/
│
├── whatsapp/         # Integration: Evolution API
│   ├── gateway/
│   ├── webhooks/
│   └── whatsapp.module.ts
│
└── decision-engine/  # Core: AI Decision
    ├── langchain/
    ├── intents/
    └── decision-engine.module.ts
```

**Princípios de cada módulo**:
- ✅ **Loosely coupled**: Comunicação via eventos (domain events)
- ✅ **Highly cohesive**: Toda lógica de um domínio em um lugar
- ✅ **Independently testable**: Pode mockar outros módulos
- ✅ **Extraction-ready**: Interfaces claras, sem dependências circulares

#### Quando Migrar para Microservices?

**Triggers para extração**:

| Trigger | Descrição | Ação |
|---------|-----------|------|
| **Scale bottleneck** | WhatsApp Gateway precisa escalar independentemente | Extrair WhatsApp Service |
| **Team growth** | 10+ desenvolvedores, times organizados por domínio | Extrair por bounded context |
| **Technology diversity** | Precisamos Python para ML ou Go para performance | Extrair serviço específico |
| **Deployment independence** | Precisamos deployar Decision Engine sem reiniciar API | Extrair Decision Engine |
| **Data volume** | Event Store >100M eventos, projections com lag | Separar write/read databases |

**Caminho de extração** (exemplo: WhatsApp Service):

```
Fase 1 (Atual): Monolito
  └─ WhatsApp Module (parte do monolito)

Fase 2 (Extração):
  ├─ Core API (monolito - WhatsApp)
  └─ WhatsApp Service (microservice)
       ├─ Ainda escreve no Event Store compartilhado
       └─ Comunica via eventos (BullMQ)

Fase 3 (Full Split):
  ├─ Core API
  └─ WhatsApp Service
       ├─ Próprio database para webhook state
       └─ Publica domain events para Event Bus
```

#### Comparação: Monolito vs Microservices

| Aspecto | Monolito Modular (Recomendado) | Microservices |
|---------|--------------------------------|---------------|
| **Time to MVP** | ✅ 4-6 semanas | ❌ 12+ semanas |
| **Complexidade Operacional** | ✅ Baixa | ❌ Alta (orquestração, tracing) |
| **Debugging** | ✅ Stack traces simples | ❌ Distributed tracing obrigatório |
| **Transações** | ✅ ACID dentro da API | ❌ Sagas/eventual consistency |
| **Event Store** | ✅ Single source of truth | ⚠️ Coordenação cuidadosa |
| **Latência de Rede** | ✅ In-process calls | ❌ Network hops |
| **Deploy** | ✅ Single artifact | ❌ Múltiplos deploys coordenados |
| **Scaling Independente** | ❌ Escala API inteira | ✅ Escala serviços individuais |
| **Diversidade Tecnológica** | ❌ Locked to Node/NestJS | ✅ Tech diferente por serviço |
| **Autonomia de Time** | ❌ Codebase compartilhado | ✅ Times independentes |

## Decisão 2: Estrutura do Monorepo

### Turborepo + pnpm ✅

**Decisão**: Monorepo gerenciado por Turborepo com pnpm para instalar dependências.

#### Estrutura de Diretórios

```
healz-monorepo/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── shared/
│   │   │   └── main.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                    # React + Vite Frontend
│   │   ├── src/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── evolution-api/          # WhatsApp Gateway
│       ├── docker-compose.yml
│       └── config/
│
├── packages/
│   ├── shared-types/           # TypeScript types compartilhados
│   │   ├── src/
│   │   │   ├── events.ts
│   │   │   ├── dtos.ts
│   │   │   └── models.ts
│   │   └── package.json
│   │
│   ├── event-schemas/          # Event schema definitions
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── ui-components/          # Shared React components
│   │   ├── src/
│   │   └── package.json
│   │
│   └── database-schema/        # Drizzle schemas
│       ├── src/
│       │   └── drizzle/
│       └── package.json
│
├── infra/
│   ├── terraform/              # Infrastructure as Code
│   │   ├── environments/
│   │   │   └── production/
│   │   ├── modules/
│   │   │   ├── cloud-run/
│   │   │   ├── cloud-sql/
│   │   │   ├── memorystore/
│   │   │   └── networking/
│   │   └── global/
│   │
│   └── docker/
│       ├── api/
│       └── web/
│
├── scripts/
│   ├── deploy-api.sh
│   ├── deploy-web.sh
│   ├── run-migrations.sh
│   └── seed-database.sh
│
├── turbo.json                  # Turborepo configuration
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # PNPM workspaces
└── .github/
    └── workflows/
        ├── api-ci.yml
        ├── api-deploy.yml
        ├── web-ci.yml
        └── web-deploy.yml
```

#### Por que Turborepo?

- ✅ **Smart caching**: Só rebuilda o que mudou
- ✅ **Parallel execution**: Tasks independentes rodam em paralelo
- ✅ **Pipeline orchestration**: Gerencia dependências entre tasks
- ✅ **Remote caching**: Cache compartilhado entre time e CI

#### Configuração Turborepo

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.json", "package.json"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    },
    "deploy": {
      "dependsOn": ["build", "test"],
      "cache": false
    }
  }
}
```

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### Change Detection Strategy

**Como funciona**:
1. Turborepo detecta mudanças via `git diff`
2. Só executa tasks de packages afetados
3. GitHub Actions usa **path filters** para triggerar workflows específicos

**Exemplo**: Se apenas `apps/api/**` muda:
- ✅ Pipeline API roda (lint, test, build, deploy)
- ❌ Pipeline Web NÃO roda (economiza tempo e dinheiro)

## Decisão 3: Cloud Provider e Serviços

### Google Cloud Platform (GCP) ✅

**Decisão**: Usar GCP como cloud provider principal.

#### Por que GCP?

- ✅ **Cloud Run**: Serverless ideal para Event Sourcing (stateless)
- ✅ **Cloud SQL**: PostgreSQL gerenciado com pgvector support
- ✅ **Memorystore**: Redis gerenciado para BullMQ
- ✅ **Presença no Brasil**: Região `southamerica-east1` (LGPD compliance)
- ✅ **Preços competitivos**: Especialmente Cloud Run (pay-per-request)
- ✅ **Terraform support**: Excelente provider

#### Configuração Budget-Optimized

**Desafio**: Orçamento de ~$200/mês (típico seria ~$750/mês).

**Solução**: Instâncias mínimas + sem HA inicial + ambiente único.

| Componente | Serviço GCP | Configuração | Custo/mês |
|------------|-------------|--------------|-----------|
| **API** | Cloud Run | min=0, max=10, 1 vCPU, 1GB RAM | $15-25 |
| **Database** | Cloud SQL PostgreSQL 15 | db-f1-micro (0.6 vCPU, 1.7GB) | $45 |
| **Redis** | Memorystore | 1GB Basic (sem HA) | $40 |
| **Evolution API** | Compute Engine | e2-micro (shared CPU, 1GB) | $8 |
| **Frontend** | Cloud Storage + CDN | Static hosting | $5 |
| **Secrets** | Secret Manager | ~10 secrets | $1 |
| **Monitoring** | Cloud Logging + Monitoring | 50GB logs/mês | $20 |
| **Networking** | VPC + Load Balancer | Basic | $15 |
| **Storage** | Cloud Storage | Backups (50GB) | $1 |
| **CI/CD** | Cloud Build | 50 builds/mês | $5 |
| **TOTAL** | | | **$155-180/mês** |

**Trade-offs**:
- ❌ Sem High Availability (sem failover automático)
- ❌ Sem read replicas (queries podem ficar lentas sob carga)
- ❌ Instâncias mínimas (latência em picos de tráfego)
- ✅ Funcional para MVP (centenas de usuários simultâneos)
- ✅ Mesma arquitetura (só aumentar specs depois)
- ✅ Escalável conforme receita crescer

**Quando escalar**:
- **$300/mês**: HA no Cloud SQL + Redis Standard HA + 2 min instances Cloud Run
- **$500/mês**: Read replica + db-custom-2-8192 + monitoring avançado
- **$1.000/mês**: Configuração robusta para produção em escala

## Próximos Documentos

Para detalhes de implementação, consulte:

- [**CLOUD_ARCHITECTURE.md**](./CLOUD_ARCHITECTURE.md) - Arquitetura GCP detalhada
- [**CI_CD.md**](./CI_CD.md) - Pipeline de CI/CD e change detection
- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Infrastructure as Code com Terraform
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Estratégia de deployment e migrations
- [**MONITORING.md**](./MONITORING.md) - Observabilidade e alertas
- [**SECURITY.md**](./SECURITY.md) - Segurança e compliance LGPD

## Caminho de Evolução

### Fase 1: MVP (Mês 1-2) ← Estamos aqui
- Monolito modular
- Ambiente único staging/production
- Instâncias mínimas (budget $180/mês)
- Deploy manual com aprovação

### Fase 2: Scaling (Mês 3-6)
- Separar staging e production
- Adicionar HA (Cloud SQL + Redis)
- Aumentar Cloud Run (min=2 instances)
- Budget: ~$500/mês

### Fase 3: Otimização (Mês 6-12)
- Read replica para projections
- Partitioning no Event Store
- Otimização de índices
- Budget: ~$1.000/mês

### Fase 4: Microservices (Mês 12+)
- Extrair WhatsApp Service (primeiro)
- API Gateway (Cloud Endpoints)
- Cloud Pub/Sub para eventos
- Budget: ~$3.000/mês

## Métricas de Sucesso

### MVP (Semana 8)
- [ ] API responde <100ms p95
- [ ] Event Store writes <10ms
- [ ] Projection lag <1s
- [ ] Load test: 1K req/min sustentado
- [ ] Custo mensal < $200
- [ ] Zero-downtime deployment funciona

### Scale (Mês 6)
- [ ] 10 organizações ativas
- [ ] 1.000 pacientes cadastrados
- [ ] 100K eventos/dia
- [ ] Uptime 99%+

### Production-Ready (Mês 12)
- [ ] 100 organizações
- [ ] 10K pacientes
- [ ] 1M eventos/dia
- [ ] Uptime 99.9%+
- [ ] LGPD compliance completo
