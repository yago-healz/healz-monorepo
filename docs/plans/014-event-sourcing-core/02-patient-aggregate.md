# Fase 2: Patient Aggregate

## Objetivo

Implementar o primeiro agregado completo (Patient) como proof of concept, incluindo eventos, projection (read model) e API REST temporária para testes.

## Pré-requisitos

- ✅ Fase 1 concluída (Event Store Foundation)

## Escopo

### O que será implementado

1. **Agregado Patient** - Lógica de domínio e regras de negócio
2. **Eventos** - PatientRegistered, PatientUpdated
3. **Projection** - patient_view (read model)
4. **Event Handlers** - Atualizam a projection
5. **API REST temporária** - Para testes manuais

### O que NÃO será implementado

- ❌ Integração com WhatsApp (Fase 3)
- ❌ Jornada do paciente (Fase 7)
- ❌ API definitiva (será substituída quando houver UI)

## Estrutura de Arquivos

```
apps/api/src/modules/
├── patient/
│   ├── patient.module.ts
│   ├── domain/
│   │   ├── patient.aggregate.ts
│   │   ├── events/
│   │   │   ├── patient-registered.event.ts
│   │   │   └── patient-updated.event.ts
│   │   └── value-objects/
│   │       └── patient-status.vo.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── register-patient.command.ts
│   │   │   └── update-patient.command.ts
│   │   ├── handlers/
│   │   │   ├── register-patient.handler.ts
│   │   │   └── update-patient.handler.ts
│   │   └── event-handlers/
│   │       ├── patient-registered.handler.ts
│   │       └── patient-updated.handler.ts
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── patient-view.entity.ts
│   │   │   └── patient.repository.ts
│   │   └── api/
│   │       ├── patient.controller.ts
│   │       └── dtos/
│   │           ├── register-patient.dto.ts
│   │           └── update-patient.dto.ts
│   └── patient.service.ts
```

## Eventos

### 1. PatientRegistered

```typescript
export interface PatientRegisteredData {
  patient_id: string;
  tenant_id: string;
  clinic_id: string;
  phone: string;
  full_name?: string;
  email?: string;
  birth_date?: string; // ISO 8601
  metadata?: Record<string, any>;
}

export class PatientRegistered implements DomainEvent<PatientRegisteredData> {
  readonly event_id: string;
  readonly event_type = 'PatientRegistered';
  readonly aggregate_type = 'Patient';
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  readonly tenant_id: string;
  readonly clinic_id: string;
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly user_id?: string;
  readonly created_at: Date;
  readonly event_data: PatientRegisteredData;
  readonly metadata?: Record<string, any>;
  
  constructor(params: {
    aggregate_id: string;
    aggregate_version: number;
    tenant_id: string;
    clinic_id: string;
    correlation_id: string;
    causation_id?: string;
    user_id?: string;
    event_data: PatientRegisteredData;
  }) {
    this.event_id = randomUUID();
    this.aggregate_id = params.aggregate_id;
    this.aggregate_version = params.aggregate_version;
    this.tenant_id = params.tenant_id;
    this.clinic_id = params.clinic_id;
    this.correlation_id = params.correlation_id;
    this.causation_id = params.causation_id;
    this.user_id = params.user_id;
    this.created_at = new Date();
    this.event_data = params.event_data;
  }
}
```

### 2. PatientUpdated

```typescript
export interface PatientUpdatedData {
  patient_id: string;
  updates: {
    full_name?: string;
    email?: string;
    birth_date?: string;
    metadata?: Record<string, any>;
  };
}

export class PatientUpdated implements DomainEvent<PatientUpdatedData> {
  // Similar structure to PatientRegistered
  readonly event_type = 'PatientUpdated';
  // ... rest of implementation
}
```

## Agregado Patient

```typescript
// domain/patient.aggregate.ts

export type PatientStatus = 'active' | 'inactive' | 'suspended';

export class Patient extends AggregateRoot {
  private patientId: string;
  private tenantId: string;
  private clinicId: string;
  private phone: string;
  private fullName?: string;
  private email?: string;
  private birthDate?: Date;
  private status: PatientStatus;
  private metadata: Record<string, any>;
  
  private constructor() {
    super();
  }
  
  /**
   * Factory method: Registrar novo paciente
   */
  static register(params: {
    patientId: string;
    tenantId: string;
    clinicId: string;
    phone: string;
    fullName?: string;
    email?: string;
    birthDate?: Date;
    correlationId: string;
    userId?: string;
  }): Patient {
    const patient = new Patient();
    
    // Validações
    if (!params.phone) {
      throw new Error('Phone is required');
    }
    
    // TODO: Validar formato do telefone
    // TODO: Validar unicidade do telefone (via repository)
    
    // Gerar evento
    const event = new PatientRegistered({
      aggregate_id: params.patientId,
      aggregate_version: 1,
      tenant_id: params.tenantId,
      clinic_id: params.clinicId,
      correlation_id: params.correlationId,
      user_id: params.userId,
      event_data: {
        patient_id: params.patientId,
        tenant_id: params.tenantId,
        clinic_id: params.clinicId,
        phone: params.phone,
        full_name: params.fullName,
        email: params.email,
        birth_date: params.birthDate?.toISOString(),
      },
    });
    
    patient.addEvent(event);
    
    return patient;
  }
  
  /**
   * Atualizar dados do paciente
   */
  update(params: {
    fullName?: string;
    email?: string;
    birthDate?: Date;
    correlationId: string;
    userId?: string;
  }): void {
    // Validações
    if (this.status === 'suspended') {
      throw new Error('Cannot update suspended patient');
    }
    
    const event = new PatientUpdated({
      aggregate_id: this.patientId,
      aggregate_version: this.version + 1,
      tenant_id: this.tenantId,
      clinic_id: this.clinicId,
      correlation_id: params.correlationId,
      user_id: params.userId,
      event_data: {
        patient_id: this.patientId,
        updates: {
          full_name: params.fullName,
          email: params.email,
          birth_date: params.birthDate?.toISOString(),
        },
      },
    });
    
    this.addEvent(event);
  }
  
  /**
   * Aplicar evento ao estado interno
   */
  protected apply(event: DomainEvent): void {
    switch (event.event_type) {
      case 'PatientRegistered':
        this.applyPatientRegistered(event as PatientRegistered);
        break;
      case 'PatientUpdated':
        this.applyPatientUpdated(event as PatientUpdated);
        break;
      default:
        throw new Error(`Unknown event type: ${event.event_type}`);
    }
  }
  
  private applyPatientRegistered(event: PatientRegistered): void {
    this.id = event.aggregate_id;
    this.patientId = event.event_data.patient_id;
    this.tenantId = event.event_data.tenant_id;
    this.clinicId = event.event_data.clinic_id;
    this.phone = event.event_data.phone;
    this.fullName = event.event_data.full_name;
    this.email = event.event_data.email;
    this.birthDate = event.event_data.birth_date 
      ? new Date(event.event_data.birth_date) 
      : undefined;
    this.status = 'active';
    this.metadata = event.event_data.metadata || {};
  }
  
  private applyPatientUpdated(event: PatientUpdated): void {
    const updates = event.event_data.updates;
    
    if (updates.full_name !== undefined) {
      this.fullName = updates.full_name;
    }
    if (updates.email !== undefined) {
      this.email = updates.email;
    }
    if (updates.birth_date !== undefined) {
      this.birthDate = new Date(updates.birth_date);
    }
    if (updates.metadata !== undefined) {
      this.metadata = { ...this.metadata, ...updates.metadata };
    }
  }
  
  // Getters
  getPatientId(): string { return this.patientId; }
  getTenantId(): string { return this.tenantId; }
  getClinicId(): string { return this.clinicId; }
  getPhone(): string { return this.phone; }
  getFullName(): string | undefined { return this.fullName; }
  getEmail(): string | undefined { return this.email; }
  getStatus(): PatientStatus { return this.status; }
}
```

## Projection (Read Model)

### patient_view Table

```sql
CREATE TABLE patient_view (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  birth_date DATE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT patient_view_phone_tenant_unique UNIQUE (phone, tenant_id)
);

CREATE INDEX idx_patient_view_tenant ON patient_view (tenant_id);
CREATE INDEX idx_patient_view_clinic ON patient_view (clinic_id);
CREATE INDEX idx_patient_view_phone ON patient_view (phone);
CREATE INDEX idx_patient_view_status ON patient_view (status);
```

### Entity

```typescript
@Entity('patient_view')
export class PatientViewEntity {
  @PrimaryColumn('uuid')
  id: string;
  
  @Column('uuid')
  tenant_id: string;
  
  @Column('uuid')
  clinic_id: string;
  
  @Column({ length: 20 })
  phone: string;
  
  @Column({ length: 255, nullable: true })
  full_name?: string;
  
  @Column({ length: 255, nullable: true })
  email?: string;
  
  @Column({ type: 'date', nullable: true })
  birth_date?: Date;
  
  @Column({ length: 20, default: 'active' })
  status: string;
  
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
  
  @CreateDateColumn()
  created_at: Date;
  
  @UpdateDateColumn()
  updated_at: Date;
}
```

## Event Handlers

### PatientRegistered Handler

```typescript
@Injectable()
@EventSubscriber('PatientRegistered')
export class PatientRegisteredHandler implements EventHandler {
  constructor(
    @InjectRepository(PatientViewEntity)
    private readonly patientViewRepo: Repository<PatientViewEntity>,
  ) {}
  
  async handle(event: DomainEvent): Promise<void> {
    const data = event.event_data as PatientRegisteredData;
    
    const view = new PatientViewEntity();
    view.id = data.patient_id;
    view.tenant_id = data.tenant_id;
    view.clinic_id = data.clinic_id;
    view.phone = data.phone;
    view.full_name = data.full_name;
    view.email = data.email;
    view.birth_date = data.birth_date ? new Date(data.birth_date) : undefined;
    view.status = 'active';
    view.metadata = data.metadata || {};
    view.created_at = event.created_at;
    view.updated_at = event.created_at;
    
    await this.patientViewRepo.save(view);
  }
}
```

### PatientUpdated Handler

```typescript
@Injectable()
@EventSubscriber('PatientUpdated')
export class PatientUpdatedHandler implements EventHandler {
  constructor(
    @InjectRepository(PatientViewEntity)
    private readonly patientViewRepo: Repository<PatientViewEntity>,
  ) {}
  
  async handle(event: DomainEvent): Promise<void> {
    const data = event.event_data as PatientUpdatedData;
    
    const view = await this.patientViewRepo.findOne({
      where: { id: data.patient_id },
    });
    
    if (!view) {
      throw new Error(`Patient view not found: ${data.patient_id}`);
    }
    
    const updates = data.updates;
    if (updates.full_name !== undefined) view.full_name = updates.full_name;
    if (updates.email !== undefined) view.email = updates.email;
    if (updates.birth_date !== undefined) {
      view.birth_date = new Date(updates.birth_date);
    }
    if (updates.metadata !== undefined) {
      view.metadata = { ...view.metadata, ...updates.metadata };
    }
    
    view.updated_at = event.created_at;
    
    await this.patientViewRepo.save(view);
  }
}
```

## Command Handlers

### Register Patient Handler

```typescript
@Injectable()
export class RegisterPatientHandler {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}
  
  async execute(command: RegisterPatientCommand): Promise<string> {
    // Criar agregado
    const patient = Patient.register({
      patientId: randomUUID(),
      tenantId: command.tenantId,
      clinicId: command.clinicId,
      phone: command.phone,
      fullName: command.fullName,
      email: command.email,
      birthDate: command.birthDate,
      correlationId: CorrelationUtil.generate('register-patient'),
      userId: command.userId,
    });
    
    // Salvar eventos
    const events = patient.getUncommittedEvents();
    await this.eventStore.appendMany(events);
    
    // Publicar eventos
    await this.eventBus.publishMany(events);
    
    return patient.getPatientId();
  }
}
```

## API REST Temporária

### Controller

```typescript
@Controller('patients')
export class PatientController {
  constructor(
    private readonly registerHandler: RegisterPatientHandler,
    private readonly updateHandler: UpdatePatientHandler,
    @InjectRepository(PatientViewEntity)
    private readonly patientViewRepo: Repository<PatientViewEntity>,
  ) {}
  
  @Post()
  async register(@Body() dto: RegisterPatientDto) {
    const patientId = await this.registerHandler.execute({
      tenantId: dto.tenant_id,
      clinicId: dto.clinic_id,
      phone: dto.phone,
      fullName: dto.full_name,
      email: dto.email,
      birthDate: dto.birth_date ? new Date(dto.birth_date) : undefined,
      userId: undefined, // TODO: Extrair do token JWT
    });
    
    return { patient_id: patientId };
  }
  
  @Get(':id')
  async getById(@Param('id') id: string) {
    const patient = await this.patientViewRepo.findOne({ where: { id } });
    
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    
    return patient;
  }
  
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    await this.updateHandler.execute({
      patientId: id,
      fullName: dto.full_name,
      email: dto.email,
      birthDate: dto.birth_date ? new Date(dto.birth_date) : undefined,
      userId: undefined, // TODO: Extrair do token JWT
    });
    
    return { success: true };
  }
  
  @Get()
  async list(
    @Query('tenant_id') tenantId: string,
    @Query('clinic_id') clinicId?: string,
  ) {
    const where: any = { tenant_id: tenantId };
    if (clinicId) where.clinic_id = clinicId;
    
    return await this.patientViewRepo.find({ where });
  }
}
```

### DTOs

```typescript
export class RegisterPatientDto {
  @IsUUID()
  tenant_id: string;
  
  @IsUUID()
  clinic_id: string;
  
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;
  
  @IsOptional()
  @IsString()
  full_name?: string;
  
  @IsOptional()
  @IsEmail()
  email?: string;
  
  @IsOptional()
  @IsDateString()
  birth_date?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  full_name?: string;
  
  @IsOptional()
  @IsEmail()
  email?: string;
  
  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
```

## Testes

### Testes Unitários do Agregado

```typescript
describe('Patient Aggregate', () => {
  it('should register new patient', () => {
    const patient = Patient.register({
      patientId: 'patient-123',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      phone: '+5511999999999',
      fullName: 'João Silva',
      correlationId: 'corr-1',
    });
    
    const events = patient.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('PatientRegistered');
    expect(events[0].event_data.phone).toBe('+5511999999999');
  });
  
  it('should update patient', () => {
    const patient = Patient.register({...});
    patient.clearUncommittedEvents();
    
    patient.update({
      fullName: 'João Silva Santos',
      correlationId: 'corr-2',
    });
    
    const events = patient.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('PatientUpdated');
  });
  
  it('should reconstruct from events', () => {
    const events = [
      new PatientRegistered({...}),
    ];
    
    const patient = new Patient();
    patient.loadFromHistory(events);
    
    expect(patient.getPhone()).toBe('+5511999999999');
    expect(patient.getVersion()).toBe(1);
  });
});
```

### Testes E2E

```typescript
describe('Patient API (e2e)', () => {
  it('POST /patients - should register patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .send({
        tenant_id: 'tenant-1',
        clinic_id: 'clinic-1',
        phone: '+5511999999999',
        full_name: 'João Silva',
      })
      .expect(201);
    
    expect(response.body.patient_id).toBeDefined();
  });
  
  it('GET /patients/:id - should get patient', async () => {
    // Create patient first
    const createResponse = await request(app.getHttpServer())
      .post('/patients')
      .send({...});
    
    const patientId = createResponse.body.patient_id;
    
    // Get patient
    const response = await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .expect(200);
    
    expect(response.body.phone).toBe('+5511999999999');
  });
});
```

## Checklist de Implementação

- [ ] Criar eventos (PatientRegistered, PatientUpdated)
- [ ] Implementar agregado Patient
- [ ] Criar migration da tabela patient_view
- [ ] Implementar PatientViewEntity
- [ ] Implementar event handlers (projection)
- [ ] Implementar command handlers
- [ ] Criar DTOs de validação
- [ ] Implementar controller REST
- [ ] Registrar event handlers no Event Bus
- [ ] Criar testes unitários do agregado
- [ ] Criar testes de integração dos handlers
- [ ] Criar testes E2E da API
- [ ] Validar fluxo completo manualmente

## Resultado Esperado

Ao final desta fase, você deve ter:

1. ✅ Agregado Patient funcionando
2. ✅ Eventos sendo salvos no Event Store
3. ✅ Projection atualizada via event handlers
4. ✅ API REST permitindo criar e consultar pacientes
5. ✅ Testes passando
6. ✅ Fluxo completo validado (API → Aggregate → Event → Projection)

**Validação:** 
1. Criar paciente via POST /patients
2. Verificar evento no Event Store
3. Verificar registro na patient_view
4. Consultar paciente via GET /patients/:id
5. Atualizar paciente via PATCH /patients/:id
6. Verificar atualização na patient_view
