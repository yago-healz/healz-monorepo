# Fase 7: PatientJourney Aggregate

## Objetivo

Implementar o agregado mais crítico do sistema: PatientJourney, que rastreia toda a jornada do paciente através de estágios (stages) e calcula o risco (risk score) baseado em comportamentos e eventos.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)
- ✅ Fase 2 concluída (Patient Aggregate)
- ✅ Fase 4 concluída (Conversation Aggregate)
- ✅ Fase 6 concluída (Appointment Aggregate)

## Escopo

### O que será implementado

1. **Agregado PatientJourney** - State machine de jornada
2. **Journey Stages** - Estágios da jornada (lead, engaged, scheduled, etc.)
3. **Risk Score Engine** - Cálculo dinâmico de risco
4. **Domain Events** - JourneyStageChanged, RiskDetected, RiskScoreRecalculated
5. **Projection patient_journey_view** - Read model
6. **Process Managers** - Orquestração de eventos entre agregados

### O que NÃO será implementado

- ❌ Machine Learning para predição de risco (futura IA avançada)
- ❌ Análise de sentimento avançada
- ❌ Dashboard de analytics (frontend)
- ❌ Alertas automáticos (notificações)

## Journey Stages

```typescript
// domain/value-objects/journey-stage.ts

export enum JourneyStage {
  // Estágio inicial
  LEAD = 'lead', // Paciente novo, sem engajamento

  // Engajamento
  ENGAGED = 'engaged', // Respondeu mensagens, interesse ativo

  // Agendamento
  SCHEDULED = 'scheduled', // Consulta agendada

  // Confirmação
  CONFIRMED = 'confirmed', // Confirmou presença

  // Execução
  IN_TREATMENT = 'in_treatment', // Compareceu à consulta

  // Finalização
  COMPLETED = 'completed', // Tratamento completo
  DROPPED = 'dropped', // Abandonou o processo

  // Risco
  AT_RISK = 'at_risk', // Risco detectado (não confirma, cancela muito, etc.)
}

export const STAGE_TRANSITIONS: Record<JourneyStage, JourneyStage[]> = {
  [JourneyStage.LEAD]: [JourneyStage.ENGAGED, JourneyStage.DROPPED],
  [JourneyStage.ENGAGED]: [JourneyStage.SCHEDULED, JourneyStage.AT_RISK, JourneyStage.DROPPED],
  [JourneyStage.SCHEDULED]: [
    JourneyStage.CONFIRMED,
    JourneyStage.AT_RISK,
    JourneyStage.ENGAGED,
    JourneyStage.DROPPED,
  ],
  [JourneyStage.CONFIRMED]: [
    JourneyStage.IN_TREATMENT,
    JourneyStage.AT_RISK,
    JourneyStage.SCHEDULED,
  ],
  [JourneyStage.IN_TREATMENT]: [JourneyStage.COMPLETED, JourneyStage.SCHEDULED],
  [JourneyStage.COMPLETED]: [],
  [JourneyStage.DROPPED]: [JourneyStage.ENGAGED], // Re-engajamento possível
  [JourneyStage.AT_RISK]: [
    JourneyStage.ENGAGED,
    JourneyStage.SCHEDULED,
    JourneyStage.CONFIRMED,
    JourneyStage.DROPPED,
  ],
};
```

## Risk Score Calculation

```typescript
// domain/value-objects/risk-score.ts

export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
}

export class RiskScore {
  private factors: RiskFactor[] = [];
  private totalScore: number = 0;

  constructor(factors?: RiskFactor[]) {
    if (factors) {
      this.factors = factors;
      this.calculate();
    }
  }

  addFactor(factor: RiskFactor): void {
    this.factors.push(factor);
    this.calculate();
  }

  private calculate(): void {
    if (this.factors.length === 0) {
      this.totalScore = 0;
      return;
    }

    const weightedSum = this.factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );

    const totalWeight = this.factors.reduce((sum, factor) => sum + factor.weight, 0);

    this.totalScore = Math.round(weightedSum / totalWeight);
  }

  getScore(): number {
    return this.totalScore;
  }

  getFactors(): RiskFactor[] {
    return [...this.factors];
  }

  getRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.totalScore < 25) return 'low';
    if (this.totalScore < 50) return 'medium';
    if (this.totalScore < 75) return 'high';
    return 'critical';
  }
}

// Exemplo de fatores de risco
export const RISK_FACTORS = {
  // Não-comparecimento
  NO_SHOW: { name: 'no_show', weight: 1.0, score: 100 },

  // Cancelamentos frequentes
  FREQUENT_CANCELLATIONS: { name: 'frequent_cancellations', weight: 0.8, score: 75 },

  // Não responde mensagens
  UNRESPONSIVE: { name: 'unresponsive', weight: 0.6, score: 60 },

  // Não confirma consulta
  NOT_CONFIRMED: { name: 'not_confirmed', weight: 0.5, score: 50 },

  // Reagendamentos múltiplos
  MULTIPLE_RESCHEDULES: { name: 'multiple_reschedules', weight: 0.4, score: 40 },

  // Inatividade prolongada
  INACTIVE: { name: 'inactive', weight: 0.3, score: 30 },
};
```

## Domain Events

```typescript
// domain/events/journey-started.event.ts

export class JourneyStartedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string, // journeyId
    public readonly patientId: string,
    public readonly clinicId: string,
    public readonly initialStage: JourneyStage,
    correlationId?: string,
    causationId?: string,
  ) {
    super('JourneyStarted', aggregateId, correlationId, causationId);
  }
}

// domain/events/journey-stage-changed.event.ts

export class JourneyStageChangedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly previousStage: JourneyStage,
    public readonly newStage: JourneyStage,
    public readonly reason: string,
    public readonly triggeredBy: string, // eventId or userId
    correlationId?: string,
    causationId?: string,
  ) {
    super('JourneyStageChanged', aggregateId, correlationId, causationId);
  }
}

// domain/events/risk-detected.event.ts

export class RiskDetectedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly riskFactors: RiskFactor[],
    public readonly riskScore: number,
    public readonly riskLevel: string,
    public readonly detectedAt: Date,
    correlationId?: string,
    causationId?: string,
  ) {
    super('RiskDetected', aggregateId, correlationId, causationId);
  }
}

// domain/events/risk-score-recalculated.event.ts

export class RiskScoreRecalculatedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly previousScore: number,
    public readonly newScore: number,
    public readonly factors: RiskFactor[],
    public readonly calculatedAt: Date,
    correlationId?: string,
    causationId?: string,
  ) {
    super('RiskScoreRecalculated', aggregateId, correlationId, causationId);
  }
}

// domain/events/journey-milestone-reached.event.ts

export class JourneyMilestoneReachedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly milestone: string, // 'first_message', 'first_appointment', 'treatment_completed', etc.
    public readonly reachedAt: Date,
    correlationId?: string,
    causationId?: string,
  ) {
    super('JourneyMilestoneReached', aggregateId, correlationId, causationId);
  }
}
```

## PatientJourney Aggregate

```typescript
// domain/aggregates/patient-journey.aggregate.ts

export class PatientJourney extends AggregateRoot {
  private patientId: string;
  private clinicId: string;
  private currentStage: JourneyStage;
  private riskScore: RiskScore;
  private milestones: Set<string> = new Set();
  private stageHistory: Array<{ stage: JourneyStage; timestamp: Date }> = [];
  private metrics: JourneyMetrics;

  // Factory method
  static start(
    id: string,
    patientId: string,
    clinicId: string,
    correlationId?: string,
  ): PatientJourney {
    const journey = new PatientJourney(id);

    const event = new JourneyStartedEvent(
      id,
      patientId,
      clinicId,
      JourneyStage.LEAD,
      correlationId,
    );

    journey.apply(event);
    journey.uncommittedEvents.push(event);

    return journey;
  }

  // Commands

  transitionTo(
    newStage: JourneyStage,
    reason: string,
    triggeredBy: string,
    correlationId?: string,
  ): void {
    // Validar transição
    const allowedTransitions = STAGE_TRANSITIONS[this.currentStage];

    if (!allowedTransitions.includes(newStage)) {
      throw new Error(
        `Invalid transition from ${this.currentStage} to ${newStage}`,
      );
    }

    const event = new JourneyStageChangedEvent(
      this.id,
      this.currentStage,
      newStage,
      reason,
      triggeredBy,
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  detectRisk(factors: RiskFactor[], correlationId?: string): void {
    const riskScore = new RiskScore(factors);

    const event = new RiskDetectedEvent(
      this.id,
      factors,
      riskScore.getScore(),
      riskScore.getRiskLevel(),
      new Date(),
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);

    // Se risco for alto e não estiver em AT_RISK, transicionar
    if (
      riskScore.getRiskLevel() in ['high', 'critical'] &&
      this.currentStage !== JourneyStage.AT_RISK &&
      this.currentStage !== JourneyStage.COMPLETED
    ) {
      this.transitionTo(
        JourneyStage.AT_RISK,
        `High risk detected: ${riskScore.getScore()}`,
        'system',
        correlationId,
      );
    }
  }

  recalculateRiskScore(factors: RiskFactor[], correlationId?: string): void {
    const newRiskScore = new RiskScore(factors);
    const previousScore = this.riskScore?.getScore() || 0;

    const event = new RiskScoreRecalculatedEvent(
      this.id,
      previousScore,
      newRiskScore.getScore(),
      factors,
      new Date(),
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  reachMilestone(milestone: string, correlationId?: string): void {
    if (this.milestones.has(milestone)) {
      return; // Já alcançado
    }

    const event = new JourneyMilestoneReachedEvent(
      this.id,
      milestone,
      new Date(),
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  // Event handlers

  private onJourneyStarted(event: JourneyStartedEvent): void {
    this.patientId = event.patientId;
    this.clinicId = event.clinicId;
    this.currentStage = event.initialStage;
    this.riskScore = new RiskScore();
    this.metrics = new JourneyMetrics();
    this.stageHistory.push({ stage: event.initialStage, timestamp: new Date() });
  }

  private onJourneyStageChanged(event: JourneyStageChangedEvent): void {
    this.currentStage = event.newStage;
    this.stageHistory.push({ stage: event.newStage, timestamp: new Date() });
  }

  private onRiskDetected(event: RiskDetectedEvent): void {
    this.riskScore = new RiskScore(event.riskFactors);
  }

  private onRiskScoreRecalculated(event: RiskScoreRecalculatedEvent): void {
    this.riskScore = new RiskScore(event.factors);
  }

  private onJourneyMilestoneReached(event: JourneyMilestoneReachedEvent): void {
    this.milestones.add(event.milestone);
  }

  // Getters

  getPatientId(): string {
    return this.patientId;
  }

  getCurrentStage(): JourneyStage {
    return this.currentStage;
  }

  getRiskScore(): number {
    return this.riskScore?.getScore() || 0;
  }

  getRiskLevel(): string {
    return this.riskScore?.getRiskLevel() || 'low';
  }

  getMilestones(): string[] {
    return Array.from(this.milestones);
  }

  getStageHistory(): Array<{ stage: JourneyStage; timestamp: Date }> {
    return [...this.stageHistory];
  }
}

// domain/value-objects/journey-metrics.ts

export class JourneyMetrics {
  messagesSent: number = 0;
  messagesReceived: number = 0;
  appointmentsScheduled: number = 0;
  appointmentsCancelled: number = 0;
  appointmentsCompleted: number = 0;
  noShows: number = 0;
  daysSinceLastInteraction: number = 0;

  incrementMessagesSent(): void {
    this.messagesSent++;
  }

  incrementMessagesReceived(): void {
    this.messagesReceived++;
  }

  incrementAppointmentsScheduled(): void {
    this.appointmentsScheduled++;
  }

  incrementAppointmentsCancelled(): void {
    this.appointmentsCancelled++;
  }

  incrementAppointmentsCompleted(): void {
    this.appointmentsCompleted++;
  }

  incrementNoShows(): void {
    this.noShows++;
  }

  updateLastInteraction(): void {
    this.daysSinceLastInteraction = 0;
  }
}
```

## Process Manager (Saga)

```typescript
// application/process-managers/patient-journey.process-manager.ts

/**
 * Process Manager que orquestra a jornada do paciente
 * reagindo a eventos de outros agregados
 */
@Injectable()
export class PatientJourneyProcessManager {
  constructor(
    private readonly journeyRepository: PatientJourneyRepository,
    private readonly pool: Pool,
  ) {}

  // Quando paciente é registrado, iniciar jornada
  @OnEvent('PatientRegistered')
  async onPatientRegistered(event: PatientRegisteredEvent): Promise<void> {
    const journeyId = randomUUID();

    const journey = PatientJourney.start(
      journeyId,
      event.aggregateId,
      event.clinicId,
      event.correlationId,
    );

    await this.journeyRepository.save(journey);
  }

  // Quando mensagem é recebida, atualizar engajamento
  @OnEvent('MessageReceived')
  async onMessageReceived(event: MessageReceivedEvent): Promise<void> {
    const journey = await this.findJourneyByPatientId(event.patientId);
    if (!journey) return;

    // Se estava em LEAD, mover para ENGAGED
    if (journey.getCurrentStage() === JourneyStage.LEAD) {
      journey.transitionTo(
        JourneyStage.ENGAGED,
        'Patient sent first message',
        event.eventId,
        event.correlationId,
      );
    }

    // Milestone: primeira mensagem
    if (journey.getMilestones().length === 0) {
      journey.reachMilestone('first_message', event.correlationId);
    }

    await this.journeyRepository.save(journey);
  }

  // Quando appointment é agendado
  @OnEvent('AppointmentScheduled')
  async onAppointmentScheduled(event: AppointmentScheduledEvent): Promise<void> {
    const journey = await this.findJourneyByPatientId(event.patientId);
    if (!journey) return;

    // Transicionar para SCHEDULED
    if (
      journey.getCurrentStage() === JourneyStage.ENGAGED ||
      journey.getCurrentStage() === JourneyStage.AT_RISK
    ) {
      journey.transitionTo(
        JourneyStage.SCHEDULED,
        'Appointment scheduled',
        event.eventId,
        event.correlationId,
      );
    }

    // Milestone: primeiro agendamento
    if (!journey.getMilestones().includes('first_appointment')) {
      journey.reachMilestone('first_appointment', event.correlationId);
    }

    await this.journeyRepository.save(journey);
  }

  // Quando appointment é confirmado
  @OnEvent('AppointmentConfirmed')
  async onAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    const journey = await this.findJourneyByAppointmentId(event.aggregateId);
    if (!journey) return;

    if (journey.getCurrentStage() === JourneyStage.SCHEDULED) {
      journey.transitionTo(
        JourneyStage.CONFIRMED,
        'Appointment confirmed',
        event.eventId,
        event.correlationId,
      );
    }

    await this.journeyRepository.save(journey);
  }

  // Quando appointment é cancelado
  @OnEvent('AppointmentCancelled')
  async onAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    const journey = await this.findJourneyByAppointmentId(event.aggregateId);
    if (!journey) return;

    // Verificar se cancela frequentemente
    const cancellationCount = await this.getCancellationCount(journey.getPatientId());

    if (cancellationCount >= 2) {
      // Detectar risco
      journey.detectRisk(
        [RISK_FACTORS.FREQUENT_CANCELLATIONS],
        event.correlationId,
      );
    } else {
      // Voltar para ENGAGED
      journey.transitionTo(
        JourneyStage.ENGAGED,
        'Appointment cancelled',
        event.eventId,
        event.correlationId,
      );
    }

    await this.journeyRepository.save(journey);
  }

  // Quando há no-show
  @OnEvent('AppointmentNoShow')
  async onAppointmentNoShow(event: AppointmentNoShowEvent): Promise<void> {
    const journey = await this.findJourneyByAppointmentId(event.aggregateId);
    if (!journey) return;

    // No-show é alto risco
    journey.detectRisk(
      [RISK_FACTORS.NO_SHOW],
      event.correlationId,
    );

    await this.journeyRepository.save(journey);
  }

  // Quando appointment é completado
  @OnEvent('AppointmentCompleted')
  async onAppointmentCompleted(event: AppointmentCompletedEvent): Promise<void> {
    const journey = await this.findJourneyByAppointmentId(event.aggregateId);
    if (!journey) return;

    journey.transitionTo(
      JourneyStage.IN_TREATMENT,
      'Appointment completed',
      event.eventId,
      event.correlationId,
    );

    // Milestone: primeira consulta realizada
    if (!journey.getMilestones().includes('first_consultation_completed')) {
      journey.reachMilestone('first_consultation_completed', event.correlationId);
    }

    await this.journeyRepository.save(journey);
  }

  // Helpers

  private async findJourneyByPatientId(patientId: string): Promise<PatientJourney | null> {
    const result = await this.pool.query(
      'SELECT id FROM patient_journey_view WHERE patient_id = $1 AND current_stage != $2',
      [patientId, JourneyStage.COMPLETED],
    );

    if (result.rows.length === 0) return null;

    return this.journeyRepository.findById(result.rows[0].id);
  }

  private async findJourneyByAppointmentId(appointmentId: string): Promise<PatientJourney | null> {
    const result = await this.pool.query(
      `
      SELECT pj.id
      FROM patient_journey_view pj
      JOIN appointment_view av ON av.patient_id = pj.patient_id
      WHERE av.id = $1
      `,
      [appointmentId],
    );

    if (result.rows.length === 0) return null;

    return this.journeyRepository.findById(result.rows[0].id);
  }

  private async getCancellationCount(patientId: string): Promise<number> {
    const result = await this.pool.query(
      `
      SELECT COUNT(*) as count
      FROM appointment_view
      WHERE patient_id = $1 AND status = 'cancelled'
      `,
      [patientId],
    );

    return parseInt(result.rows[0].count);
  }
}
```

## Projection: patient_journey_view

```sql
-- migrations/xxxx_create_patient_journey_view.sql

CREATE TABLE patient_journey_view (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  current_stage VARCHAR(50) NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  milestones JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '{}',
  stage_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patient_view(id),
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT unique_patient_active_journey UNIQUE (patient_id, current_stage)
    WHERE current_stage != 'completed'
);

CREATE INDEX idx_journey_patient ON patient_journey_view(patient_id);
CREATE INDEX idx_journey_clinic ON patient_journey_view(clinic_id);
CREATE INDEX idx_journey_stage ON patient_journey_view(current_stage);
CREATE INDEX idx_journey_risk_level ON patient_journey_view(risk_level);
CREATE INDEX idx_journey_risk_score ON patient_journey_view(risk_score);
```

## Event Handlers (Projections)

```typescript
// application/event-handlers/patient-journey-view.handler.ts

@Injectable()
export class PatientJourneyViewHandler {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  @OnEvent('JourneyStarted')
  async onJourneyStarted(event: JourneyStartedEvent): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO patient_journey_view (
        id, patient_id, clinic_id, current_stage, risk_score, risk_level,
        milestones, metrics, stage_history, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 0, 'low', '[]', '{}', '[]', NOW(), NOW())
      `,
      [event.aggregateId, event.patientId, event.clinicId, event.initialStage],
    );
  }

  @OnEvent('JourneyStageChanged')
  async onJourneyStageChanged(event: JourneyStageChangedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE patient_journey_view
      SET current_stage = $2,
          stage_history = stage_history || $3::jsonb,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        event.aggregateId,
        event.newStage,
        JSON.stringify([
          {
            stage: event.newStage,
            timestamp: new Date(),
            reason: event.reason,
          },
        ]),
      ],
    );
  }

  @OnEvent('RiskDetected')
  async onRiskDetected(event: RiskDetectedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE patient_journey_view
      SET risk_score = $2,
          risk_level = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId, event.riskScore, event.riskLevel],
    );
  }

  @OnEvent('RiskScoreRecalculated')
  async onRiskScoreRecalculated(event: RiskScoreRecalculatedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE patient_journey_view
      SET risk_score = $2,
          risk_level = $3,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        event.aggregateId,
        event.newScore,
        new RiskScore(event.factors).getRiskLevel(),
      ],
    );
  }

  @OnEvent('JourneyMilestoneReached')
  async onJourneyMilestoneReached(event: JourneyMilestoneReachedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE patient_journey_view
      SET milestones = milestones || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        event.aggregateId,
        JSON.stringify([
          {
            milestone: event.milestone,
            reachedAt: event.reachedAt,
          },
        ]),
      ],
    );
  }
}
```

## Testes

### Testes do Agregado

```typescript
describe('PatientJourney Aggregate', () => {
  it('should start journey', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');

    expect(journey.getCurrentStage()).toBe(JourneyStage.LEAD);
    expect(journey.getUncommittedEvents()).toHaveLength(1);
    expect(journey.getUncommittedEvents()[0]).toBeInstanceOf(JourneyStartedEvent);
  });

  it('should transition from LEAD to ENGAGED', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');
    journey.clearUncommittedEvents();

    journey.transitionTo(JourneyStage.ENGAGED, 'First message sent', 'system');

    expect(journey.getCurrentStage()).toBe(JourneyStage.ENGAGED);
  });

  it('should not allow invalid transition', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');

    expect(() => {
      journey.transitionTo(JourneyStage.COMPLETED, 'Invalid', 'system');
    }).toThrow('Invalid transition');
  });

  it('should detect risk', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');
    journey.clearUncommittedEvents();

    journey.detectRisk([RISK_FACTORS.NO_SHOW]);

    expect(journey.getRiskScore()).toBeGreaterThan(0);
    expect(journey.getUncommittedEvents()).toHaveLength(2); // RiskDetected + StageChanged
  });

  it('should reach milestone', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');
    journey.clearUncommittedEvents();

    journey.reachMilestone('first_message');

    expect(journey.getMilestones()).toContain('first_message');
  });

  it('should not reach same milestone twice', () => {
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');

    journey.reachMilestone('first_message');
    journey.clearUncommittedEvents();
    journey.reachMilestone('first_message');

    expect(journey.getUncommittedEvents()).toHaveLength(0);
  });
});
```

### Testes do Process Manager

```typescript
describe('PatientJourneyProcessManager', () => {
  it('should start journey when patient registered', async () => {
    const event = new PatientRegisteredEvent('patient-1', 'clinic-1', 'John', 'Doe');

    await processManager.onPatientRegistered(event);

    const journey = await findJourneyByPatientId('patient-1');
    expect(journey.getCurrentStage()).toBe(JourneyStage.LEAD);
  });

  it('should transition to ENGAGED on first message', async () => {
    // Setup: criar journey
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');
    await repository.save(journey);

    const event = new MessageReceivedEvent('conv-1', 'patient-1', 'Olá');

    await processManager.onMessageReceived(event);

    const updated = await repository.findById('j-1');
    expect(updated.getCurrentStage()).toBe(JourneyStage.ENGAGED);
  });

  it('should detect risk on multiple cancellations', async () => {
    // Setup: criar journey e cancelamentos
    const journey = PatientJourney.start('j-1', 'patient-1', 'clinic-1');
    await repository.save(journey);

    // Simular 2 cancelamentos anteriores no banco
    await pool.query(
      `INSERT INTO appointment_view (id, patient_id, clinic_id, doctor_id, scheduled_at, duration, status)
       VALUES ('a-1', 'patient-1', 'clinic-1', 'doctor-1', NOW(), 60, 'cancelled')`,
    );

    const event = new AppointmentCancelledEvent('a-2', new Date(), 'patient');

    await processManager.onAppointmentCancelled(event);

    const updated = await repository.findById('j-1');
    expect(updated.getRiskLevel()).toBe('high');
  });
});
```

## Checklist de Implementação

- [ ] Definir JourneyStage enum e transições válidas
- [ ] Implementar RiskScore value object
- [ ] Criar domain events (JourneyStarted, StageChanged, RiskDetected, etc.)
- [ ] Implementar PatientJourney Aggregate
- [ ] Criar PatientJourneyProcessManager (saga)
- [ ] Criar migration para patient_journey_view
- [ ] Implementar PatientJourneyViewHandler
- [ ] Implementar PatientJourneyRepository
- [ ] Criar testes unitários do agregado
- [ ] Criar testes do process manager
- [ ] Criar testes de integração E2E do fluxo completo
- [ ] Validar orquestração entre agregados

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Agregado PatientJourney com state machine funcionando
2. ✅ Cálculo de risco automático baseado em comportamentos
3. ✅ Process Manager orquestrando eventos entre agregados
4. ✅ Projection patient_journey_view atualizada em tempo real
5. ✅ Milestones sendo rastreados automaticamente
6. ✅ Transições de estágio validadas e registradas
7. ✅ Todos os testes passando (unit, integration, e2e)

**Validação:**
1. Criar patient → journey inicia em LEAD
2. Enviar mensagem → journey transiciona para ENGAGED
3. Agendar consulta → journey transiciona para SCHEDULED
4. Confirmar consulta → journey transiciona para CONFIRMED
5. No-show → detecta risco alto e marca como AT_RISK
6. Cancelar 2x → detecta risco e marca como AT_RISK
7. Completar consulta → journey transiciona para IN_TREATMENT
