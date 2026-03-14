# 05 — Página de Detalhe do Médico + Agenda

**Objetivo:** Criar a página de detalhe/edição do perfil do médico e a configuração de agenda individual.

**Depende de:** 04 (doctors API hooks)

---

## Arquivos a criar

### `apps/web/src/routes/_authenticated/clinic/doctors/$doctorId.tsx`

Rota `/clinic/doctors/:doctorId` com layout de tabs (via search param `tab`).

**Tabs:**
| ID | Label | Componente |
|----|-------|-----------|
| `perfil` | Perfil | `DoctorProfileCard` |
| `agenda` | Agenda | `DoctorScheduleTab` |
| `procedimentos` | Procedimentos | `DoctorProceduresTab` (task 06) |

**Dados:** `useDoctor(clinicId, doctorId)` carregado no nível da rota.

**Search params (Zod):** `tab` com valores `perfil | agenda | procedimentos`, default `perfil`.

### `apps/web/src/features/clinic/components/doctors/doctor-profile-card.tsx`

Card com dados do perfil + formulário de edição inline.

**Seção 1 — Dados do perfil (editável):**
- Avatar (iniciais do nome, ou foto se `photoUrl`)
- Nome e email (readonly, vêm do user)
- CRM — input, max 50
- Especialidade — input, max 100
- Bio — textarea

Botão "Salvar" → `useUpdateDoctor()`

**Seção 2 — Vínculo com a clínica:**
- Duração padrão (minutos) — number input, min 5, max 480
- Notas — textarea
- Status do vínculo — switch ativo/inativo

Botão "Salvar vínculo" → `useUpdateDoctorLink()`

### `apps/web/src/features/clinic/components/doctors/doctor-schedule-tab.tsx`

**Reutilizar o padrão visual de `scheduling-tab.tsx` da clínica.** Mesma estrutura de 3 seções:

**Seção 1 — Horário de Atendimento:**
- 7 dias da semana, cada um com toggle isOpen + slots de horário (from/to)
- Botão "+" para adicionar slot, "x" para remover
- Componente `DayRow` reutilizável (pode extrair do scheduling-tab ou duplicar)

**Seção 2 — Regras de Agendamento:**
- Duração padrão da consulta (minutos) — number input
- Antecedência mínima (horas) — number input
- Dias futuros máximos — number input

**Seção 3 — Bloqueios Específicos:**
- Lista de bloqueios existentes com data, horário e motivo
- Formulário para adicionar: date picker + from/to + reason (optional)
- Botão de remover bloqueio

**Dados:** `useDoctorSchedule(clinicId, doctorId)`
**Salvar:** `useSaveDoctorSchedule()` — envia o objeto completo

**Estado local:** Manter todo o formulário em state local (useState), inicializado com dados do query. Botão "Salvar" no final envia tudo de uma vez (mesmo padrão do scheduling-tab da clínica).

---

## Critérios de aceite

- [ ] Rota `/clinic/doctors/:doctorId` funcional com 3 tabs
- [ ] Perfil editável com CRM, especialidade, bio
- [ ] Vínculo editável com duração padrão e notas
- [ ] Agenda com horários semanais configuráveis
- [ ] Bloqueios específicos com date picker
- [ ] Regras de agendamento editáveis
- [ ] Loading states e toasts nas mutations
- [ ] Botão de voltar para `/clinic/doctors`
