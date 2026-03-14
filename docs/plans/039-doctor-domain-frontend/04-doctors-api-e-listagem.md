# 04 — Doctors API Hooks + Página de Listagem

**Objetivo:** Criar API hooks para o módulo de médicos e a página de listagem de médicos da clínica.

**Depende de:** 01 (endpoints + tipos)

---

## Arquivos a criar

### `apps/web/src/features/clinic/api/doctors.api.ts`

**Queries:**
- `useDoctors(clinicId)` — `GET /clinics/:clinicId/doctors` → `DoctorProfile[]`
- `useDoctor(clinicId, doctorId)` — `GET /clinics/:clinicId/doctors/:doctorId` → `DoctorProfile`
- `useDoctorSchedule(clinicId, doctorId)` — `GET .../schedule` → `DoctorSchedule`

**Mutations:**
- `useCreateDoctor()` — `POST /clinics/:clinicId/doctors`
- `useUpdateDoctor()` — `PATCH /clinics/:clinicId/doctors/:doctorId`
- `useDeactivateDoctor()` — `DELETE /clinics/:clinicId/doctors/:doctorId`
- `useUpdateDoctorLink()` — `PATCH .../link`
- `useSaveDoctorSchedule()` — `PATCH .../schedule`

**Cache keys:** `['doctors', clinicId, ...]`

### `apps/web/src/features/clinic/components/doctors/doctors-table.tsx`

Tabela com colunas:
| Coluna | Campo | Notas |
|--------|-------|-------|
| Nome | `name` | Com avatar placeholder (iniciais) |
| CRM | `crm` | Fallback: "—" |
| Especialidade | `specialty` | Fallback: "—" |
| Status | `doctorClinic.isActive` | Badge ativo/inativo |
| Ações | — | Menu dropdown: Ver detalhes, Desativar |

**Busca:** Input de search filtrando por nome/CRM/especialidade (client-side, lista é pequena).

**Linha clicável:** Navega para `/clinic/doctors/:doctorId`.

### `apps/web/src/features/clinic/components/doctors/doctor-form-dialog.tsx`

Dialog para vincular um novo médico à clínica.

**Campos (React Hook Form + Zod):**
- `userId` — required, select/combobox que lista usuários com role `doctor` da clínica que ainda não têm perfil de médico
- `crm` — optional, max 50
- `specialty` — optional, max 100
- `bio` — optional, textarea

**Nota:** Para listar usuários elegíveis, usar a lista de membros da clínica filtrada por role `doctor`. Se não houver endpoint específico, filtrar client-side da lista de membros existente.

### `apps/web/src/routes/_authenticated/clinic/doctors/index.tsx`

Rota `/clinic/doctors` com:
- Título "Médicos"
- Botão "Adicionar Médico" → abre `DoctorFormDialog`
- `DoctorsTable` com dados de `useDoctors(clinicId)`
- Empty state quando não há médicos

---

## Critérios de aceite

- [ ] API hooks criados em `doctors.api.ts` (queries + mutations)
- [ ] Página `/clinic/doctors` renderiza tabela de médicos
- [ ] Dialog de criação funcional
- [ ] Busca client-side por nome/CRM/especialidade
- [ ] Navegação para detalhe ao clicar na linha
- [ ] Status badge (ativo/inativo)
- [ ] Loading state e empty state
