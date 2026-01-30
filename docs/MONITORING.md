# Monitoring & Observability

## Visão Geral

Estratégia completa de observabilidade para Healz usando **três pilares**: Metrics, Logs e Traces.

## Os Três Pilares

```
┌─────────────────────────────────────────────────┐
│              OBSERVABILIDADE                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 METRICS     📝 LOGS      🔍 TRACES           │
│  (Cloud         (Cloud       (Cloud              │
│   Monitoring)    Logging)     Trace)             │
│                                                  │
│  O quê?         Por quê?     Onde?               │
│  Quando?        Contexto?    Quanto tempo?       │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 1. Metrics (Cloud Monitoring)

### Métricas Customizadas para Event Sourcing

#### Event Store Metrics

```typescript
// apps/api/src/monitoring/metrics.ts
import { MeterProvider } from '@google-cloud/opentelemetry-cloud-monitoring-exporter';

export class EventStoreMetrics {
  private meter = new MeterProvider().getMeter('healz-event-store');

  // Latência de escrita de eventos
  eventWriteLatency = this.meter.createHistogram('event_write_latency_ms', {
    description: 'Latência para escrever evento no Event Store',
    unit: 'ms'
  });

  // Throughput de eventos
  eventWriteCounter = this.meter.createCounter('event_write_total', {
    description: 'Total de eventos escritos'
  });

  // Erros ao escrever eventos
  eventWriteErrors = this.meter.createCounter('event_write_errors', {
    description: 'Erros ao escrever eventos'
  });

  // Tamanho de eventos
  eventSizeBytes = this.meter.createHistogram('event_size_bytes', {
    description: 'Tamanho do payload do evento',
    unit: 'bytes'
  });
}
```

**Uso**:
```typescript
// No EventStoreRepository
async append(event: DomainEvent): Promise<void> {
  const start = Date.now();

  try {
    await this.db.insert(events).values(event);

    // Record metrics
    const duration = Date.now() - start;
    this.metrics.eventWriteLatency.record(duration, {
      event_type: event.event_type,
      tenant_id: event.tenant_id
    });

    this.metrics.eventWriteCounter.add(1, {
      event_type: event.event_type
    });

    this.metrics.eventSizeBytes.record(
      JSON.stringify(event.event_data).length,
      { event_type: event.event_type }
    );

  } catch (error) {
    this.metrics.eventWriteErrors.add(1, {
      event_type: event.event_type,
      error_type: error.constructor.name
    });
    throw error;
  }
}
```

#### Projection Metrics

```typescript
export class ProjectionMetrics {
  private meter = new MeterProvider().getMeter('healz-projections');

  // Lag das projections (tempo entre evento criado e processado)
  projectionLag = this.meter.createHistogram('projection_lag_seconds', {
    description: 'Lag da projection (event created → processed)',
    unit: 'seconds'
  });

  // Erros ao processar projections
  projectionErrors = this.meter.createCounter('projection_errors', {
    description: 'Erros ao atualizar projection'
  });

  // Tempo de processamento
  projectionProcessingTime = this.meter.createHistogram('projection_processing_time_ms', {
    description: 'Tempo para processar uma projection',
    unit: 'ms'
  });
}
```

**Uso**:
```typescript
// No ProjectionHandler
async handle(event: DomainEvent): Promise<void> {
  const start = Date.now();
  const eventAge = Date.now() - new Date(event.created_at).getTime();

  try {
    await this.updateProjection(event);

    // Record lag
    this.metrics.projectionLag.record(eventAge / 1000, {
      projection_name: this.projectionName,
      event_type: event.event_type
    });

    // Record processing time
    this.metrics.projectionProcessingTime.record(Date.now() - start, {
      projection_name: this.projectionName
    });

  } catch (error) {
    this.metrics.projectionErrors.add(1, {
      projection_name: this.projectionName,
      event_type: event.event_type
    });
    throw error;
  }
}
```

#### API Metrics

```typescript
export class APIMetrics {
  private meter = new MeterProvider().getMeter('healz-api');

  // Request duration
  requestDuration = this.meter.createHistogram('http_request_duration_ms', {
    description: 'Duração de requests HTTP',
    unit: 'ms'
  });

  // Request counter
  requestCounter = this.meter.createCounter('http_requests_total', {
    description: 'Total de requests HTTP'
  });

  // Error counter
  errorCounter = this.meter.createCounter('http_errors_total', {
    description: 'Total de erros HTTP'
  });
}
```

**Middleware NestJS**:
```typescript
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metrics: APIMetrics) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      // Record duration
      this.metrics.requestDuration.record(duration, {
        method: req.method,
        path: req.route?.path || 'unknown',
        status: res.statusCode.toString()
      });

      // Count requests
      this.metrics.requestCounter.add(1, {
        method: req.method,
        status: res.statusCode.toString()
      });

      // Count errors
      if (res.statusCode >= 500) {
        this.metrics.errorCounter.add(1, {
          method: req.method,
          path: req.route?.path || 'unknown'
        });
      }
    });

    next();
  }
}
```

#### Business Metrics

```typescript
export class BusinessMetrics {
  private meter = new MeterProvider().getMeter('healz-business');

  // Pacientes cadastrados
  patientsRegistered = this.meter.createCounter('patients_registered_total', {
    description: 'Total de pacientes cadastrados'
  });

  // Agendamentos realizados
  appointmentsScheduled = this.meter.createCounter('appointments_scheduled_total', {
    description: 'Total de agendamentos realizados'
  });

  // Conversas escaladas
  conversationsEscalated = this.meter.createCounter('conversations_escalated_total', {
    description: 'Conversas escaladas para atendimento humano'
  });

  // Mensagens WhatsApp enviadas
  whatsappMessagesSent = this.meter.createCounter('whatsapp_messages_sent', {
    description: 'Total de mensagens WhatsApp enviadas'
  });

  // Falhas de entrega WhatsApp
  whatsappDeliveryFailures = this.meter.createCounter('whatsapp_delivery_failures', {
    description: 'Falhas ao enviar mensagens WhatsApp'
  });
}
```

### Dashboard Cloud Monitoring

**Terraform** (infra/terraform/modules/monitoring/dashboard.tf):
```hcl
resource "google_monitoring_dashboard" "healz_main" {
  dashboard_json = jsonencode({
    displayName = "Healz - Production"

    gridLayout = {
      widgets = [
        # Event Write Latency
        {
          title = "Event Write Latency (p95)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/event_write_latency_ms\""
                  aggregation = {
                    alignmentPeriod   = "60s"
                    perSeriesAligner  = "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }]
            thresholds = [{
              value = 10
              color = "YELLOW"
              label = "Warning"
            }, {
              value = 50
              color = "RED"
              label = "Critical"
            }]
          }
        },

        # Projection Lag
        {
          title = "Projection Lag (max)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/projection_lag_seconds\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MAX"
                  }
                }
              }
            }]
            thresholds = [{
              value = 1
              color = "YELLOW"
            }, {
              value = 5
              color = "RED"
            }]
          }
        },

        # API Request Duration
        {
          title = "API Request Duration (p95)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/http_request_duration_ms\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        },

        # Error Rate
        {
          title = "API Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/http_errors_total\" / metric.type=\"custom.googleapis.com/http_requests_total\""
                }
              }
            }]
            thresholds = [{
              value = 0.01  # 1%
              color = "YELLOW"
            }, {
              value = 0.05  # 5%
              color = "RED"
            }]
          }
        }
      ]
    }
  })
}
```

### SLOs (Service Level Objectives)

```hcl
# Event Write Latency SLO: 95% dos writes <10ms
resource "google_monitoring_slo" "event_write_latency" {
  service      = google_monitoring_service.healz_api.service_id
  display_name = "Event Write Latency <10ms"

  request_based_sli {
    distribution_cut {
      distribution_filter = "metric.type=\"custom.googleapis.com/event_write_latency_ms\""
      range {
        min = 0
        max = 10  # ms
      }
    }
  }

  goal                = 0.95  # 95%
  rolling_period_days = 30
}

# API Availability SLO: 99.9% uptime
resource "google_monitoring_slo" "api_availability" {
  service      = google_monitoring_service.healz_api.service_id
  display_name = "API Availability 99.9%"

  request_based_sli {
    good_total_ratio {
      good_service_filter = join(" AND ", [
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.response_code_class!=\"5xx\""
      ])
      total_service_filter = "metric.type=\"run.googleapis.com/request_count\""
    }
  }

  goal                = 0.999  # 99.9%
  rolling_period_days = 30
}
```

## 2. Logs (Cloud Logging)

### Structured Logging

```typescript
// apps/api/src/logging/structured-logger.ts
import { Logger } from '@google-cloud/logging';

interface LogEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  correlation_id?: string;
  tenant_id?: string;
  user_id?: string;
  [key: string]: any;
}

export class StructuredLogger {
  private logger: Logger;

  constructor(name: string) {
    this.logger = new Logger({ projectId: process.env.GCP_PROJECT_ID });
  }

  log(entry: LogEntry) {
    const metadata = {
      severity: entry.severity,
      labels: {
        component: entry.component || 'api',
        environment: process.env.NODE_ENV || 'development'
      },
      trace: entry.correlation_id ? `projects/${process.env.GCP_PROJECT_ID}/traces/${entry.correlation_id}` : undefined
    };

    this.logger.write(this.logger.entry(metadata, entry));
  }

  // Helpers
  info(message: string, data?: Record<string, any>) {
    this.log({ severity: 'INFO', message, ...data });
  }

  warn(message: string, data?: Record<string, any>) {
    this.log({ severity: 'WARNING', message, ...data });
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    this.log({
      severity: 'ERROR',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...data
    });
  }
}
```

**Uso**:
```typescript
// Log evento criado
logger.info('Event stored successfully', {
  correlation_id: event.correlation_id,
  event_id: event.event_id,
  event_type: event.event_type,
  aggregate_id: event.aggregate_id,
  tenant_id: event.tenant_id
});

// Log erro em projection
logger.error('Projection update failed', error, {
  correlation_id: event.correlation_id,
  projection_name: 'PatientView',
  event_type: event.event_type,
  event_id: event.event_id
});
```

### Log-Based Metrics

```bash
# Criar métrica a partir de logs
gcloud logging metrics create projection_errors \
  --description="Count of projection errors" \
  --log-filter='severity="ERROR" AND jsonPayload.component="projection"'

# Métrica para WhatsApp delivery failures
gcloud logging metrics create whatsapp_delivery_failures \
  --log-filter='severity="ERROR" AND jsonPayload.error_type="WhatsAppDeliveryFailed"'
```

### Log Retention

**Budget-friendly retention**:

```bash
# INFO logs: 7 dias
gcloud logging sinks create healz-info-logs-sink \
  storage.googleapis.com/healz-logs-archive \
  --log-filter='severity="INFO"' \
  --retention-days=7

# WARNING+ logs: 30 dias
gcloud logging sinks create healz-warning-logs-sink \
  storage.googleapis.com/healz-logs-archive \
  --log-filter='severity>="WARNING"' \
  --retention-days=30

# ERROR+ logs: 90 dias
gcloud logging sinks create healz-error-logs-sink \
  storage.googleapis.com/healz-logs-archive \
  --log-filter='severity>="ERROR"' \
  --retention-days=90
```

**Custo**: ~$20/mês (50GB/mês, mostly WARNING+)

## 3. Traces (Cloud Trace)

### Distributed Tracing

```typescript
// apps/api/src/tracing/tracer.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export function setupTracing() {
  const provider = new NodeTracerProvider();

  // Exporter para Cloud Trace
  provider.addSpanProcessor(
    new BatchSpanProcessor(new TraceExporter())
  );

  // Instrumentações automáticas
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  provider.register();
}
```

**Trace Event Flow**:
```typescript
import { trace } from '@opentelemetry/api';

export class EventFlowTracer {
  private tracer = trace.getTracer('healz-event-flow');

  async traceEventProcessing(event: DomainEvent, fn: () => Promise<void>) {
    return this.tracer.startActiveSpan(
      `process_event_${event.event_type}`,
      {
        attributes: {
          'event.type': event.event_type,
          'event.id': event.event_id,
          'correlation.id': event.correlation_id,
          'tenant.id': event.tenant_id,
        }
      },
      async (span) => {
        try {
          await fn();
          span.setStatus({ code: 1 });  // OK
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: 2, message: error.message });  // ERROR
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}
```

**Exemplo de trace**:
```
Trace: Patient Appointment Scheduled (correlation_id: abc-123)
├─ [10ms] MessageReceived webhook
│   ├─ [2ms] Validate webhook signature
│   └─ [8ms] Parse message payload
├─ [5ms] Write PatientRegistered event
├─ [3ms] Write ConversationStarted event
├─ [50ms] Decision Engine: Detect intent
│   ├─ [30ms] OpenAI API call
│   │   ├─ [5ms] Prepare prompt
│   │   ├─ [23ms] HTTP request to OpenAI
│   │   └─ [2ms] Parse response
│   └─ [20ms] Extract appointment data
├─ [5ms] Write AppointmentScheduled event
├─ [15ms] Update projections (async)
│   ├─ [5ms] Update patient_view
│   ├─ [5ms] Update appointment_view
│   └─ [5ms] Update journey_view
└─ [8ms] Send confirmation message
Total: 96ms
```

### Sampling Strategy

**Para economizar custos**, sample apenas 10% de requests:

```typescript
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const provider = new NodeTracerProvider({
  sampler: new TraceIdRatioBasedSampler(0.1)  // 10%
});
```

**Sempre trace** requests com erros:
```typescript
import { ParentBasedSampler, AlwaysOnSampler } from '@opentelemetry/sdk-trace-base';

// Custom sampler
class ErrorAwareSampler {
  shouldSample(context, traceId, spanName, spanKind, attributes) {
    // Sempre sample se tiver erro
    if (attributes['http.status_code'] >= 500) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLE };
    }

    // 10% dos demais
    return Math.random() < 0.1
      ? { decision: SamplingDecision.RECORD_AND_SAMPLE }
      : { decision: SamplingDecision.NOT_RECORD };
  }
}
```

## Alerting

### Alert Policies

**Terraform** (infra/terraform/modules/monitoring/alerts.tf):

```hcl
# CRITICAL: Event write latency > 50ms
resource "google_monitoring_alert_policy" "event_write_latency_critical" {
  display_name = "[CRITICAL] Event Write Latency > 50ms"
  combiner     = "OR"

  conditions {
    display_name = "Event write p95 > 50ms"

    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/event_write_latency_ms\""
      duration        = "120s"
      comparison      = "COMPARISON_GT"
      threshold_value = 50

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.id
  ]

  alert_strategy {
    auto_close = "1800s"  # Auto-resolve após 30 min
  }
}

# CRITICAL: Projection lag > 5s
resource "google_monitoring_alert_policy" "projection_lag_critical" {
  display_name = "[CRITICAL] Projection Lag > 5s"
  combiner     = "OR"

  conditions {
    display_name = "Projection lag max > 5s"

    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/projection_lag_seconds\""
      duration        = "300s"  # 5 minutes
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]
}

# WARNING: Projection lag > 1s
resource "google_monitoring_alert_policy" "projection_lag_warning" {
  display_name = "[WARNING] Projection Lag > 1s"
  combiner     = "OR"

  conditions {
    display_name = "Projection lag max > 1s"

    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/projection_lag_seconds\""
      duration        = "120s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.slack.id]
}

# CRITICAL: API Error Rate > 5%
resource "google_monitoring_alert_policy" "api_error_rate" {
  display_name = "[CRITICAL] API Error Rate > 5%"
  combiner     = "OR"

  conditions {
    display_name = "5xx error rate > 5%"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.response_code_class=\"5xx\""
      ])

      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05  # 5%

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]
}
```

### Notification Channels

```hcl
# Slack (Warnings)
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Healz Slack"
  type         = "slack"

  labels = {
    channel_name = "#healz-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_webhook_url
  }
}

# PagerDuty (Critical)
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "Healz PagerDuty"
  type         = "pagerduty"

  sensitive_labels {
    service_key = var.pagerduty_service_key
  }
}

# Email (Fallback)
resource "google_monitoring_notification_channel" "email" {
  display_name = "Healz Email"
  type         = "email"

  labels = {
    email_address = "alerts@healz.com.br"
  }
}
```

## Error Tracking

### Cloud Error Reporting

Automático para exceptions não tratadas no Cloud Run.

**Manual reporting**:
```typescript
import { ErrorReporting } from '@google-cloud/error-reporting';

const errors = new ErrorReporting();

try {
  await riskyOperation();
} catch (error) {
  errors.report(error, {
    user: userId,
    serviceContext: {
      service: 'healz-api',
      version: process.env.COMMIT_SHA
    }
  });
  throw error;
}
```

## Custo de Monitoring

| Serviço | Uso | Custo/mês |
|---------|-----|-----------|
| Cloud Logging | 50GB/mês | $10 |
| Cloud Monitoring | Custom metrics | $5 |
| Cloud Trace | 10% sampling | $3 |
| Error Reporting | Incluído | $0 |
| Dashboards | 2 dashboards | $0 |
| **TOTAL** | | **~$18/mês** |

## Runbooks

### Troubleshooting Guides

**Event Write Latency Alto**:
1. Check Cloud SQL CPU/memory
2. Verificar connections pool usage
3. Analisar slow queries (pg_stat_statements)
4. Considerar upgrade de tier

**Projection Lag Alto**:
1. Verificar Redis latency
2. Check BullMQ queue size
3. Analisar projection handler performance
4. Considerar adicionar workers

**API Error Rate Alto**:
1. Check recent deploys (rollback?)
2. Verificar Cloud SQL connectivity
3. Analisar error logs (correlation_id)
4. Check external dependencies (OpenAI, WhatsApp)

## Próximos Passos

- [**SECURITY.md**](./SECURITY.md) - Segurança e LGPD
- [**INFRASTRUCTURE.md**](./INFRASTRUCTURE.md) - Terraform IaC
