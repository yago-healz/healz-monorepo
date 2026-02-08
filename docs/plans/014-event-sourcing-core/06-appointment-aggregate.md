# Fase 6: Appointment Aggregate

## Objetivo

Implementar o agregado de agendamentos (Appointment) que gerencia todo o ciclo de vida de consultas: criação, confirmação, cancelamento e reagendamento.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)
- ✅ Fase 2 concluída (Patient Aggregate)
- ✅ Fase 4 concluída (Conversation Aggregate)

## Escopo

### O que será implementado

1. **Agregado Appointment** - Gerenciamento de consultas
2. **Eventos de domínio** - AppointmentScheduled, AppointmentConfirmed, AppointmentCancelled, AppointmentRescheduled
3. **Projection appointment_view** - Read model para consultas
4. **Regras de negócio** - Validações de horário, conflitos, etc.
5. **API REST temporária** - Endpoints para testes

### O que NÃO será implementado

- ❌ Integração com calendário externo (Google Calendar, etc.)
- ❌ Notificações por email/SMS (futura)
- ❌ Recorrência de consultas
- ❌ Lista de espera
- ❌ Sistema de fila

## Domain Events

```typescript
// domain/events/appointment-scheduled.event.ts

export class AppointmentScheduledEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly patientId: string,
    public readonly clinicId: string,
    public readonly doctorId: string,
    public readonly scheduledAt: Date,
    public readonly duration: number, // minutes
    public readonly reason?: string,
    public readonly notes?: string,
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentScheduled', aggregateId, correlationId, causationId);
  }
}

// domain/events/appointment-confirmed.event.ts

export class AppointmentConfirmedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly confirmedAt: Date,
    public readonly confirmedBy: string, // userId or 'patient'
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentConfirmed', aggregateId, correlationId, causationId);
  }
}

// domain/events/appointment-cancelled.event.ts

export class AppointmentCancelledEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly cancelledAt: Date,
    public readonly cancelledBy: string, // userId or 'patient'
    public readonly reason?: string,
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentCancelled', aggregateId, correlationId, causationId);
  }
}

// domain/events/appointment-rescheduled.event.ts

export class AppointmentRescheduledEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly previousScheduledAt: Date,
    public readonly newScheduledAt: Date,
    public readonly rescheduledAt: Date,
    public readonly rescheduledBy: string,
    public readonly reason?: string,
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentRescheduled', aggregateId, correlationId, causationId);
  }
}

// domain/events/appointment-completed.event.ts

export class AppointmentCompletedEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly completedAt: Date,
    public readonly notes?: string,
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentCompleted', aggregateId, correlationId, causationId);
  }
}

// domain/events/appointment-no-show.event.ts

export class AppointmentNoShowEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly missedAt: Date,
    public readonly notifiedAt?: Date,
    correlationId?: string,
    causationId?: string,
  ) {
    super('AppointmentNoShow', aggregateId, correlationId, causationId);
  }
}
```

## Appointment Aggregate

```typescript
// domain/aggregates/appointment.aggregate.ts

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export class Appointment extends AggregateRoot {
  private patientId: string;
  private clinicId: string;
  private doctorId: string;
  private scheduledAt: Date;
  private duration: number;
  private status: AppointmentStatus;
  private reason?: string;
  private notes?: string;
  private confirmedAt?: Date;
  private cancelledAt?: Date;
  private completedAt?: Date;

  // Factory method
  static schedule(
    id: string,
    patientId: string,
    clinicId: string,
    doctorId: string,
    scheduledAt: Date,
    duration: number,
    reason?: string,
    notes?: string,
    correlationId?: string,
  ): Appointment {
    const appointment = new Appointment(id);

    // Validações
    if (scheduledAt <= new Date()) {
      throw new Error('Appointment must be scheduled in the future');
    }

    if (duration <= 0 || duration > 480) {
      throw new Error('Duration must be between 1 and 480 minutes');
    }

    const event = new AppointmentScheduledEvent(
      id,
      patientId,
      clinicId,
      doctorId,
      scheduledAt,
      duration,
      reason,
      notes,
      correlationId,
    );

    appointment.apply(event);
    appointment.uncommittedEvents.push(event);

    return appointment;
  }

  // Commands

  confirm(confirmedBy: string, correlationId?: string): void {
    if (this.status !== AppointmentStatus.SCHEDULED) {
      throw new Error('Only scheduled appointments can be confirmed');
    }

    const event = new AppointmentConfirmedEvent(
      this.id,
      new Date(),
      confirmedBy,
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  cancel(cancelledBy: string, reason?: string, correlationId?: string): void {
    if (this.status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot cancel completed appointment');
    }

    if (this.status === AppointmentStatus.CANCELLED) {
      throw new Error('Appointment is already cancelled');
    }

    const event = new AppointmentCancelledEvent(
      this.id,
      new Date(),
      cancelledBy,
      reason,
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  reschedule(
    newScheduledAt: Date,
    rescheduledBy: string,
    reason?: string,
    correlationId?: string,
  ): void {
    if (this.status !== AppointmentStatus.SCHEDULED && this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error('Only scheduled or confirmed appointments can be rescheduled');
    }

    if (newScheduledAt <= new Date()) {
      throw new Error('New appointment time must be in the future');
    }

    const event = new AppointmentRescheduledEvent(
      this.id,
      this.scheduledAt,
      newScheduledAt,
      new Date(),
      rescheduledBy,
      reason,
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  complete(notes?: string, correlationId?: string): void {
    if (this.status !== AppointmentStatus.SCHEDULED && this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error('Only scheduled or confirmed appointments can be completed');
    }

    const event = new AppointmentCompletedEvent(
      this.id,
      new Date(),
      notes,
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  markNoShow(correlationId?: string): void {
    if (this.status !== AppointmentStatus.SCHEDULED && this.status !== AppointmentStatus.CONFIRMED) {
      throw new Error('Only scheduled or confirmed appointments can be marked as no-show');
    }

    const event = new AppointmentNoShowEvent(
      this.id,
      new Date(),
      new Date(),
      correlationId,
      this.getLastEventId(),
    );

    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  // Event handlers

  private onAppointmentScheduled(event: AppointmentScheduledEvent): void {
    this.patientId = event.patientId;
    this.clinicId = event.clinicId;
    this.doctorId = event.doctorId;
    this.scheduledAt = event.scheduledAt;
    this.duration = event.duration;
    this.reason = event.reason;
    this.notes = event.notes;
    this.status = AppointmentStatus.SCHEDULED;
  }

  private onAppointmentConfirmed(event: AppointmentConfirmedEvent): void {
    this.confirmedAt = event.confirmedAt;
    this.status = AppointmentStatus.CONFIRMED;
  }

  private onAppointmentCancelled(event: AppointmentCancelledEvent): void {
    this.cancelledAt = event.cancelledAt;
    this.status = AppointmentStatus.CANCELLED;
  }

  private onAppointmentRescheduled(event: AppointmentRescheduledEvent): void {
    this.scheduledAt = event.newScheduledAt;
    // Mantém status (SCHEDULED ou CONFIRMED)
  }

  private onAppointmentCompleted(event: AppointmentCompletedEvent): void {
    this.completedAt = event.completedAt;
    this.status = AppointmentStatus.COMPLETED;
  }

  private onAppointmentNoShow(event: AppointmentNoShowEvent): void {
    this.status = AppointmentStatus.NO_SHOW;
  }

  // Getters

  getStatus(): AppointmentStatus {
    return this.status;
  }

  getScheduledAt(): Date {
    return this.scheduledAt;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getClinicId(): string {
    return this.clinicId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }
}
```

## Projection: appointment_view

```sql
-- migrations/xxxx_create_appointment_view.sql

CREATE TABLE appointment_view (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  reason TEXT,
  notes TEXT,
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patient_view(id),
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE INDEX idx_appointment_patient ON appointment_view(patient_id);
CREATE INDEX idx_appointment_clinic ON appointment_view(clinic_id);
CREATE INDEX idx_appointment_doctor ON appointment_view(doctor_id);
CREATE INDEX idx_appointment_scheduled_at ON appointment_view(scheduled_at);
CREATE INDEX idx_appointment_status ON appointment_view(status);

-- Índice composto para buscar conflitos de horário
CREATE INDEX idx_appointment_doctor_time ON appointment_view(doctor_id, scheduled_at, duration);
```

## Event Handlers (Projections)

```typescript
// application/event-handlers/appointment-view.handler.ts

@Injectable()
export class AppointmentViewHandler {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  @OnEvent('AppointmentScheduled')
  async onAppointmentScheduled(event: AppointmentScheduledEvent): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO appointment_view (
        id, patient_id, clinic_id, doctor_id, scheduled_at, duration,
        status, reason, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `,
      [
        event.aggregateId,
        event.patientId,
        event.clinicId,
        event.doctorId,
        event.scheduledAt,
        event.duration,
        'scheduled',
        event.reason,
        event.notes,
      ],
    );
  }

  @OnEvent('AppointmentConfirmed')
  async onAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE appointment_view
      SET status = 'confirmed',
          confirmed_at = $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId, event.confirmedAt],
    );
  }

  @OnEvent('AppointmentCancelled')
  async onAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE appointment_view
      SET status = 'cancelled',
          cancelled_at = $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId, event.cancelledAt],
    );
  }

  @OnEvent('AppointmentRescheduled')
  async onAppointmentRescheduled(event: AppointmentRescheduledEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE appointment_view
      SET scheduled_at = $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId, event.newScheduledAt],
    );
  }

  @OnEvent('AppointmentCompleted')
  async onAppointmentCompleted(event: AppointmentCompletedEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE appointment_view
      SET status = 'completed',
          completed_at = $2,
          notes = COALESCE($3, notes),
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId, event.completedAt, event.notes],
    );
  }

  @OnEvent('AppointmentNoShow')
  async onAppointmentNoShow(event: AppointmentNoShowEvent): Promise<void> {
    await this.pool.query(
      `
      UPDATE appointment_view
      SET status = 'no_show',
          updated_at = NOW()
      WHERE id = $1
      `,
      [event.aggregateId],
    );
  }
}
```

## Repository

```typescript
// infrastructure/repositories/appointment.repository.ts

@Injectable()
export class AppointmentRepository {
  constructor(private readonly eventStore: EventStore) {}

  async save(appointment: Appointment): Promise<void> {
    const events = appointment.getUncommittedEvents();

    for (const event of events) {
      await this.eventStore.append(event);
    }

    appointment.clearUncommittedEvents();
  }

  async findById(id: string): Promise<Appointment | null> {
    const events = await this.eventStore.getByAggregateId(id);

    if (events.length === 0) {
      return null;
    }

    const appointment = new Appointment(id);
    appointment.loadFromHistory(events);

    return appointment;
  }

  async findByCorrelationId(correlationId: string): Promise<Appointment[]> {
    const events = await this.eventStore.getByCorrelationId(correlationId);

    // Group by aggregateId
    const grouped = events.reduce((acc, event) => {
      if (!acc[event.aggregateId]) {
        acc[event.aggregateId] = [];
      }
      acc[event.aggregateId].push(event);
      return acc;
    }, {} as Record<string, DomainEvent[]>);

    return Object.entries(grouped).map(([id, events]) => {
      const appointment = new Appointment(id);
      appointment.loadFromHistory(events);
      return appointment;
    });
  }
}
```

## Application Service

```typescript
// application/services/appointment.service.ts

@Injectable()
export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly pool: Pool,
  ) {}

  async scheduleAppointment(
    patientId: string,
    clinicId: string,
    doctorId: string,
    scheduledAt: Date,
    duration: number,
    reason?: string,
    notes?: string,
    correlationId?: string,
  ): Promise<string> {
    // Verificar conflitos de horário
    const conflicts = await this.checkTimeConflicts(doctorId, scheduledAt, duration);

    if (conflicts.length > 0) {
      throw new Error('Time slot not available');
    }

    const id = randomUUID();
    const appointment = Appointment.schedule(
      id,
      patientId,
      clinicId,
      doctorId,
      scheduledAt,
      duration,
      reason,
      notes,
      correlationId,
    );

    await this.repository.save(appointment);

    return id;
  }

  async confirmAppointment(id: string, confirmedBy: string, correlationId?: string): Promise<void> {
    const appointment = await this.repository.findById(id);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    appointment.confirm(confirmedBy, correlationId);
    await this.repository.save(appointment);
  }

  async cancelAppointment(
    id: string,
    cancelledBy: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.repository.findById(id);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    appointment.cancel(cancelledBy, reason, correlationId);
    await this.repository.save(appointment);
  }

  async rescheduleAppointment(
    id: string,
    newScheduledAt: Date,
    rescheduledBy: string,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    const appointment = await this.repository.findById(id);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Verificar conflitos no novo horário
    const conflicts = await this.checkTimeConflicts(
      appointment.getDoctorId(),
      newScheduledAt,
      60, // duration padrão
      id, // excluir o próprio appointment
    );

    if (conflicts.length > 0) {
      throw new Error('New time slot not available');
    }

    appointment.reschedule(newScheduledAt, rescheduledBy, reason, correlationId);
    await this.repository.save(appointment);
  }

  private async checkTimeConflicts(
    doctorId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string,
  ): Promise<any[]> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const query = `
      SELECT id
      FROM appointment_view
      WHERE doctor_id = $1
        AND status IN ('scheduled', 'confirmed')
        AND (
          (scheduled_at >= $2 AND scheduled_at < $3)
          OR (scheduled_at + (duration * interval '1 minute') > $2 AND scheduled_at + (duration * interval '1 minute') <= $3)
          OR (scheduled_at <= $2 AND scheduled_at + (duration * interval '1 minute') >= $3)
        )
        ${excludeAppointmentId ? 'AND id != $4' : ''}
    `;

    const params = excludeAppointmentId
      ? [doctorId, scheduledAt, endTime, excludeAppointmentId]
      : [doctorId, scheduledAt, endTime];

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}
```

## API REST (Temporária)

```typescript
// presentation/controllers/appointment.controller.ts

@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    @Inject('DATABASE_POOL') private readonly pool: Pool,
  ) {}

  @Post()
  async create(@Body() dto: ScheduleAppointmentDto): Promise<{ id: string }> {
    const id = await this.appointmentService.scheduleAppointment(
      dto.patientId,
      dto.clinicId,
      dto.doctorId,
      new Date(dto.scheduledAt),
      dto.duration,
      dto.reason,
      dto.notes,
      dto.correlationId,
    );

    return { id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM appointment_view WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Appointment not found');
    }

    return result.rows[0];
  }

  @Get()
  async findAll(@Query() query: FindAppointmentsDto): Promise<any> {
    let sql = 'SELECT * FROM appointment_view WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (query.patientId) {
      sql += ` AND patient_id = $${paramCount}`;
      params.push(query.patientId);
      paramCount++;
    }

    if (query.clinicId) {
      sql += ` AND clinic_id = $${paramCount}`;
      params.push(query.clinicId);
      paramCount++;
    }

    if (query.doctorId) {
      sql += ` AND doctor_id = $${paramCount}`;
      params.push(query.doctorId);
      paramCount++;
    }

    if (query.status) {
      sql += ` AND status = $${paramCount}`;
      params.push(query.status);
      paramCount++;
    }

    sql += ' ORDER BY scheduled_at DESC';

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmAppointmentDto,
  ): Promise<{ message: string }> {
    await this.appointmentService.confirmAppointment(id, dto.confirmedBy, dto.correlationId);
    return { message: 'Appointment confirmed' };
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<{ message: string }> {
    await this.appointmentService.cancelAppointment(
      id,
      dto.cancelledBy,
      dto.reason,
      dto.correlationId,
    );
    return { message: 'Appointment cancelled' };
  }

  @Patch(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<{ message: string }> {
    await this.appointmentService.rescheduleAppointment(
      id,
      new Date(dto.newScheduledAt),
      dto.rescheduledBy,
      dto.reason,
      dto.correlationId,
    );
    return { message: 'Appointment rescheduled' };
  }
}
```

## DTOs

```typescript
// presentation/dtos/appointment.dto.ts

export class ScheduleAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  clinicId: string;

  @IsUUID()
  doctorId: string;

  @IsISO8601()
  scheduledAt: string;

  @IsInt()
  @Min(15)
  @Max(480)
  duration: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}

export class ConfirmAppointmentDto {
  @IsString()
  confirmedBy: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}

export class CancelAppointmentDto {
  @IsString()
  cancelledBy: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}

export class RescheduleAppointmentDto {
  @IsISO8601()
  newScheduledAt: string;

  @IsString()
  rescheduledBy: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;
}

export class FindAppointmentsDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
```

## Testes

### Testes do Agregado

```typescript
describe('Appointment Aggregate', () => {
  it('should schedule appointment', () => {
    const appointment = Appointment.schedule(
      'appt-1',
      'patient-1',
      'clinic-1',
      'doctor-1',
      new Date('2026-03-01T10:00:00Z'),
      60,
      'Consulta de rotina',
    );

    expect(appointment.getStatus()).toBe(AppointmentStatus.SCHEDULED);
    expect(appointment.getUncommittedEvents()).toHaveLength(1);
    expect(appointment.getUncommittedEvents()[0]).toBeInstanceOf(AppointmentScheduledEvent);
  });

  it('should not schedule appointment in the past', () => {
    expect(() => {
      Appointment.schedule(
        'appt-1',
        'patient-1',
        'clinic-1',
        'doctor-1',
        new Date('2020-01-01T10:00:00Z'),
        60,
      );
    }).toThrow('Appointment must be scheduled in the future');
  });

  it('should confirm scheduled appointment', () => {
    const appointment = Appointment.schedule(
      'appt-1',
      'patient-1',
      'clinic-1',
      'doctor-1',
      new Date('2026-03-01T10:00:00Z'),
      60,
    );

    appointment.clearUncommittedEvents();
    appointment.confirm('patient');

    expect(appointment.getStatus()).toBe(AppointmentStatus.CONFIRMED);
    expect(appointment.getUncommittedEvents()).toHaveLength(1);
    expect(appointment.getUncommittedEvents()[0]).toBeInstanceOf(AppointmentConfirmedEvent);
  });

  it('should cancel appointment', () => {
    const appointment = Appointment.schedule(
      'appt-1',
      'patient-1',
      'clinic-1',
      'doctor-1',
      new Date('2026-03-01T10:00:00Z'),
      60,
    );

    appointment.clearUncommittedEvents();
    appointment.cancel('patient', 'Imprevisto');

    expect(appointment.getStatus()).toBe(AppointmentStatus.CANCELLED);
  });

  it('should not cancel completed appointment', () => {
    const appointment = Appointment.schedule(
      'appt-1',
      'patient-1',
      'clinic-1',
      'doctor-1',
      new Date('2026-03-01T10:00:00Z'),
      60,
    );

    appointment.clearUncommittedEvents();
    appointment.complete();

    expect(() => {
      appointment.cancel('patient');
    }).toThrow('Cannot cancel completed appointment');
  });

  it('should reschedule appointment', () => {
    const appointment = Appointment.schedule(
      'appt-1',
      'patient-1',
      'clinic-1',
      'doctor-1',
      new Date('2026-03-01T10:00:00Z'),
      60,
    );

    const newDate = new Date('2026-03-02T14:00:00Z');
    appointment.clearUncommittedEvents();
    appointment.reschedule(newDate, 'patient');

    expect(appointment.getScheduledAt()).toEqual(newDate);
    expect(appointment.getUncommittedEvents()).toHaveLength(1);
    expect(appointment.getUncommittedEvents()[0]).toBeInstanceOf(AppointmentRescheduledEvent);
  });
});
```

### Testes E2E

```typescript
describe('Appointments API (E2E)', () => {
  it('POST /appointments - should schedule appointment', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
        scheduledAt: '2026-03-01T10:00:00Z',
        duration: 60,
        reason: 'Consulta de rotina',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
  });

  it('GET /appointments/:id - should return appointment', async () => {
    // Primeiro criar
    const createResponse = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
        scheduledAt: '2026-03-01T10:00:00Z',
        duration: 60,
      });

    const id = createResponse.body.id;

    // Buscar
    const response = await request(app.getHttpServer())
      .get(`/appointments/${id}`)
      .expect(200);

    expect(response.body.id).toBe(id);
    expect(response.body.status).toBe('scheduled');
  });

  it('PATCH /appointments/:id/confirm - should confirm appointment', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
        scheduledAt: '2026-03-01T10:00:00Z',
        duration: 60,
      });

    const id = createResponse.body.id;

    await request(app.getHttpServer())
      .patch(`/appointments/${id}/confirm`)
      .send({ confirmedBy: 'patient' })
      .expect(200);

    // Verificar status
    const response = await request(app.getHttpServer())
      .get(`/appointments/${id}`);

    expect(response.body.status).toBe('confirmed');
  });

  it('should not schedule in conflicting time slot', async () => {
    // Primeiro agendamento
    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
        scheduledAt: '2026-03-01T10:00:00Z',
        duration: 60,
      });

    // Segundo agendamento no mesmo horário
    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: 'patient-2',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
        scheduledAt: '2026-03-01T10:00:00Z',
        duration: 60,
      })
      .expect(400);
  });
});
```

## Checklist de Implementação

- [ ] Criar domain events (AppointmentScheduled, Confirmed, Cancelled, Rescheduled, Completed, NoShow)
- [ ] Implementar Appointment Aggregate com regras de negócio
- [ ] Criar migration para appointment_view
- [ ] Implementar AppointmentViewHandler (projections)
- [ ] Implementar AppointmentRepository
- [ ] Implementar AppointmentService com validação de conflitos
- [ ] Criar API REST temporária (controller + DTOs)
- [ ] Criar testes unitários do agregado
- [ ] Criar testes de integração (projections)
- [ ] Criar testes E2E da API
- [ ] Validar detecção de conflitos de horário

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Agregado Appointment funcionando com todas as transições de estado
2. ✅ Projection appointment_view atualizada em tempo real
3. ✅ Validação de conflitos de horário funcionando
4. ✅ API REST para criar, confirmar, cancelar e reagendar
5. ✅ Todos os testes passando (unit, integration, e2e)
6. ✅ Sistema pronto para integrar com Conversation (Fase 4)

**Validação:**
1. Criar appointment via API → verifica no event store e na projection
2. Tentar agendar no mesmo horário → retorna erro de conflito
3. Confirmar appointment → status muda para confirmed
4. Cancelar appointment → status muda para cancelled
5. Reagendar appointment → scheduled_at é atualizado
6. Marcar como no-show → status muda para no_show
