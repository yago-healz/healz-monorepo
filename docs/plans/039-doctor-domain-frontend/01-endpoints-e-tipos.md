# 01 — Endpoints e Tipos TypeScript

**Objetivo:** Registrar todos os endpoints do Doctor Domain como constantes tipadas e criar os tipos TypeScript correspondentes aos DTOs do backend.

---

## Arquivos a modificar

### `apps/web/src/lib/api/endpoints.ts`

Adicionar ao objeto `ENDPOINTS`:

```typescript
DOCTORS: {
  LIST: (clinicId: string) => `/clinics/${clinicId}/doctors`,
  CREATE: (clinicId: string) => `/clinics/${clinicId}/doctors`,
  GET: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
  UPDATE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
  DEACTIVATE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
  UPDATE_LINK: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/link`,
  GET_SCHEDULE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/schedule`,
  SAVE_SCHEDULE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/schedule`,
  CLINICS: (doctorId: string) => `/doctors/${doctorId}/clinics`,
  PROCEDURES: {
    LIST: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures`,
    LINK: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures`,
    UPDATE: (clinicId: string, doctorId: string, procedureId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures/${procedureId}`,
    UNLINK: (clinicId: string, doctorId: string, procedureId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures/${procedureId}`,
  },
},
PROCEDURES: {
  LIST: (clinicId: string) => `/clinics/${clinicId}/procedures`,
  CREATE: (clinicId: string) => `/clinics/${clinicId}/procedures`,
  GET: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
  UPDATE: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
  DEACTIVATE: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
},
PAYMENT_METHODS: {
  LIST: (clinicId: string) => `/clinics/${clinicId}/payment-methods`,
  CREATE: (clinicId: string) => `/clinics/${clinicId}/payment-methods`,
  UPDATE: (clinicId: string, id: string) => `/clinics/${clinicId}/payment-methods/${id}`,
  DEACTIVATE: (clinicId: string, id: string) => `/clinics/${clinicId}/payment-methods/${id}`,
},
```

---

## Arquivos a criar

### `apps/web/src/types/doctor.types.ts`

```typescript
// === Doctor Profile ===

export interface DoctorClinicLink {
  id: string
  defaultDuration: number
  notes: string | null
  isActive: boolean
}

export interface DoctorProfile {
  id: string
  userId: string
  name: string
  email: string
  crm: string | null
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
  doctorClinic: DoctorClinicLink
}

export interface CreateDoctorProfileDto {
  userId: string
  crm?: string
  specialty?: string
  bio?: string
  photoUrl?: string
}

export interface UpdateDoctorProfileDto {
  crm?: string
  specialty?: string
  bio?: string
  photoUrl?: string
  isActive?: boolean
}

export interface UpdateDoctorClinicDto {
  defaultDuration?: number
  notes?: string
  isActive?: boolean
}

// === Doctor Schedule ===

export interface DoctorTimeSlot {
  id: string
  from: string  // HH:MM
  to: string    // HH:MM
}

export interface DoctorDaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  isOpen: boolean
  timeSlots: DoctorTimeSlot[]
}

export interface DoctorSpecificBlock {
  id: string
  date: string  // YYYY-MM-DD
  from: string  // HH:MM
  to: string    // HH:MM
  reason?: string
}

export interface DoctorSchedule {
  id: string | null
  doctorClinicId: string
  weeklySchedule: DoctorDaySchedule[]
  specificBlocks: DoctorSpecificBlock[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  createdAt: string | null
  updatedAt: string | null
}

export interface SaveDoctorScheduleDto {
  weeklySchedule: DoctorDaySchedule[]
  defaultAppointmentDuration: number
  minimumAdvanceHours: number
  maxFutureDays: number
  specificBlocks: DoctorSpecificBlock[]
}

// === Doctor Procedures ===

export interface DoctorProcedure {
  id: string
  procedureId: string
  procedureName: string
  procedureCategory: string | null
  procedureDefaultDuration: number
  price: number | null
  durationOverride: number | null
  effectiveDuration: number
  isActive: boolean
}

export interface LinkDoctorProcedureDto {
  procedureId: string
  price?: number
  durationOverride?: number
}

export interface UpdateDoctorProcedureDto {
  price?: number
  durationOverride?: number
  isActive?: boolean
}

// === Clinics for Doctor ===

export interface ClinicForDoctor {
  id: string
  name: string
  status: string
  link: DoctorClinicLink
}
```

### `apps/web/src/types/procedure.types.ts`

```typescript
export interface Procedure {
  id: string
  clinicId: string
  name: string
  description: string | null
  category: string | null
  defaultDuration: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateProcedureDto {
  name: string
  description?: string
  category?: string
  defaultDuration: number
}

export interface UpdateProcedureDto {
  name?: string
  description?: string
  category?: string
  defaultDuration?: number
  isActive?: boolean
}

export interface ListProceduresParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: 'active' | 'inactive' | 'all'
}
```

### `apps/web/src/types/payment-method.types.ts`

```typescript
export type PaymentMethodType = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'insurance' | 'bank_transfer'

export interface PaymentMethod {
  id: string
  clinicId: string
  type: PaymentMethodType
  name: string
  instructions: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreatePaymentMethodDto {
  type: PaymentMethodType
  name: string
  instructions?: string
}

export interface UpdatePaymentMethodDto {
  type?: PaymentMethodType
  name?: string
  instructions?: string
  isActive?: boolean
}
```

### Atualizar `apps/web/src/types/index.ts`

Adicionar re-exports:

```typescript
export * from './doctor.types'
export * from './procedure.types'
export * from './payment-method.types'
```

---

## Critérios de aceite

- [ ] Endpoints DOCTORS, PROCEDURES e PAYMENT_METHODS adicionados a `endpoints.ts`
- [ ] 3 arquivos de tipos criados com todas as interfaces/DTOs
- [ ] Re-exports adicionados ao `types/index.ts`
- [ ] `pnpm exec tsc --noEmit` passa sem erros no `apps/web`
