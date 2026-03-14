# 06 — Vínculo Médico ↔ Procedimentos

**Objetivo:** Criar a tab de procedimentos dentro da página de detalhe do médico, permitindo vincular/desvincular procedimentos com preço e duração customizados.

**Depende de:** 02 (procedures API), 05 (doctor detail page)

---

## Arquivos a criar

### `apps/web/src/features/clinic/api/doctor-procedures.api.ts`

**Queries:**
- `useDoctorProcedures(clinicId, doctorId)` — `GET .../procedures` → `DoctorProcedure[]`

**Mutations:**
- `useLinkDoctorProcedure()` — `POST .../procedures`
- `useUpdateDoctorProcedure()` — `PATCH .../procedures/:procedureId`
- `useUnlinkDoctorProcedure()` — `DELETE .../procedures/:procedureId`

**Cache keys:** `['doctor-procedures', clinicId, doctorId]`
**Invalidação:** Mutations invalidam `['doctor-procedures', clinicId, doctorId]`

### `apps/web/src/features/clinic/components/doctors/doctor-procedures-tab.tsx`

**Layout:**

**Cabeçalho:** Botão "Vincular Procedimento"

**Tabela de procedimentos vinculados:**
| Coluna | Campo | Notas |
|--------|-------|-------|
| Procedimento | `procedureName` | — |
| Categoria | `procedureCategory` | Badge, fallback "—" |
| Duração base | `procedureDefaultDuration` | Ex: "30 min" |
| Duração customizada | `durationOverride` | Se null, mostrar "—" (usa base) |
| Preço | `price` | Formatado R$ X,XX. Se null: "A definir" |
| Ações | — | Editar, Desvincular |

**Dialog "Vincular Procedimento":**
- Select/combobox com procedimentos da clínica (`useProcedures`) que ainda não estão vinculados ao médico
- `price` — optional, number input com máscara de moeda
- `durationOverride` — optional, number input (min 5, max 480). Placeholder: "Usar duração padrão"

**Dialog "Editar Vínculo":**
- Mesmo formulário, mas preenchido com valores atuais
- Mutation: `useUpdateDoctorProcedure()`

**Ação "Desvincular":**
- Dialog de confirmação
- Mutation: `useUnlinkDoctorProcedure()`

**Empty state:** "Nenhum procedimento vinculado. Vincule procedimentos para definir o que este médico realiza."

---

## Critérios de aceite

- [ ] API hooks criados em `doctor-procedures.api.ts`
- [ ] Tab "Procedimentos" funcional na página de detalhe do médico
- [ ] Vincular procedimento com preço e duração opcionais
- [ ] Editar preço e duração de vínculo existente
- [ ] Desvincular com confirmação
- [ ] Filtra procedimentos já vinculados no select de vincular
- [ ] Loading states e toasts
