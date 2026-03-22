# 046 - Carol: Evolução para Secretária Inteligente de Clínica

## Visão Geral

Evoluir a Carol de uma assistente básica de FAQ/agendamento (com dados mockados e agenda de clínica) para uma **secretária inteligente completa**, capaz de:

1. Listar médicos da clínica e suas especialidades
2. Verificar disponibilidade **por médico** (não mais por clínica)
3. Criar agendamentos reais vinculados a médicos específicos
4. Identificar e gerenciar pacientes automaticamente (preparação para WhatsApp)
5. Buscar médicos por nome, especialidade ou procedimento

## Diagnóstico do Estado Atual

### Tools existentes (6):
| Tool | Status | Problema |
|------|--------|----------|
| `GetClinicInfoTool` | OK | Funcional |
| `GetServicesTool` | Parcial | Lista procedimentos agregados, sem vincular a médicos |
| `GetOperatingHoursTool` | Deprecar | Usa agenda da clínica (vai morrer) |
| `CheckAvailabilityTool` | Reescrever | Consulta agenda da clínica, não do médico |
| `CreateAppointmentTool` | Mockado | Não cria de verdade, não tem doctorId |
| `GetPaymentMethodsTool` | OK | Funcional |

### Infraestrutura que já existe mas Carol NÃO usa:
- `DoctorService.findAll(clinicId)` — lista médicos com nome, especialidade, CRM
- `DoctorService.getSchedule(clinicId, doctorId)` — agenda individual (weeklySchedule + specificBlocks)
- `DoctorService.listProcedures(clinicId, doctorId)` — procedimentos por médico com preço
- `DoctorGoogleCalendarService` — free/busy por médico
- `AppointmentService.schedule()` — criação real via Event Sourcing com conflitos
- Tabela `doctor_clinic_schedules` — agenda individual por médico/clínica

## Arquitetura de Tools Proposta

### Tools Finais (8 tools):

| # | Tool | Input | Output | Novo? |
|---|------|-------|--------|-------|
| 1 | `GetClinicInfoTool` | — | nome, descrição, endereço | Existente (manter) |
| 2 | **`ListDoctorsTool`** | `{ specialty?, procedure? }` | médicos com nome, especialidade, procedimentos | **NOVO** |
| 3 | **`GetDoctorAvailabilityTool`** | `{ doctorId, date }` | slots disponíveis do médico | **NOVO** (substitui CheckAvailability + GetOperatingHours) |
| 4 | **`CreateAppointmentTool`** | `{ doctorId, date, time, patientName, patientPhone?, service? }` | appointment real criado | **REESCRITA** |
| 5 | `GetServicesTool` | `{ doctorId? }` | procedimentos (filtráveis por médico) | Evoluir |
| 6 | `GetPaymentMethodsTool` | — | formas de pagamento | Existente (manter) |
| 7 | **`FindOrCreatePatientTool`** | `{ phone?, name?, cpf?, email? }` | patientId + dados conhecidos | **NOVO** |
| 8 | **`GetPatientAppointmentsTool`** | `{ patientId }` | próximos agendamentos do paciente | **NOVO** |

### Tools Removidas:
- `GetOperatingHoursTool` — substituída por `GetDoctorAvailabilityTool`
- `CheckAvailabilityTool` — substituída por `GetDoctorAvailabilityTool`

## Fases de Implementação

| Fase | Descrição | Dependências |
|------|-----------|--------------|
| **Fase 1** | Patient Contact: identificação e persistência de pacientes | Nenhuma |
| **Fase 2** | ListDoctorsTool: listar médicos por nome/especialidade/procedimento | Nenhuma |
| **Fase 3** | GetDoctorAvailabilityTool: disponibilidade por médico + Google Calendar | Fase 2 |
| **Fase 4** | CreateAppointmentTool real: agendamento via Event Sourcing | Fase 1, 2, 3 |
| **Fase 5** | Evolução GetServicesTool + GetPatientAppointmentsTool | Fase 1, 4 |
| **Fase 6** | System prompt + integração final + deprecação agenda clínica | Fase 2, 3, 4, 5 |

**Fases 1 e 2 são independentes e podem ser implementadas em paralelo.**

## Documentos do Plano

- `00-overview.md` — Este documento (visão geral)
- `01-patient-contact.md` — Fase 1: Identificação e persistência de pacientes
- `02-list-doctors-tool.md` — Fase 2: ListDoctorsTool
- `03-doctor-availability-tool.md` — Fase 3: GetDoctorAvailabilityTool
- `04-create-appointment-real.md` — Fase 4: CreateAppointmentTool real
- `05-services-and-patient-appointments.md` — Fase 5: Evolução de tools complementares
- `06-system-prompt-integration.md` — Fase 6: System prompt + integração final
