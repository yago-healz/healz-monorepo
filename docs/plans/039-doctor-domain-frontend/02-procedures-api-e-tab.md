# 02 — Catálogo de Procedimentos (API + Tab)

**Objetivo:** Criar API hooks para procedures e reescrever a services-tab para usar o módulo de Procedures da API em vez do JSON via Carol config.

**Depende de:** 01 (endpoints + tipos)

---

## Arquivos a criar

### `apps/web/src/features/clinic/api/procedures.api.ts`

API hooks com Tanstack Query v5. Seguir padrão de `clinics-api.ts`.

**Queries:**
- `useProcedures(clinicId, params)` — `GET /clinics/:clinicId/procedures` → `PaginatedResponse<Procedure>`
- `useProcedure(clinicId, id)` — `GET /clinics/:clinicId/procedures/:id` → `Procedure`

**Mutations:**
- `useCreateProcedure()` — `POST /clinics/:clinicId/procedures`
- `useUpdateProcedure()` — `PATCH /clinics/:clinicId/procedures/:id`
- `useDeactivateProcedure()` — `DELETE /clinics/:clinicId/procedures/:id`

**Cache keys:** `['procedures', clinicId, ...]`
**Invalidação:** Mutations invalidam `['procedures', clinicId]`

---

## Arquivos a modificar

### `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx` — REESCREVER

Substituir a implementação atual (que usa `useClinicServices` / JSON via Carol config) pelo módulo `procedures` da API.

**Comportamento atual a preservar:**
- Card com lista de itens
- Botão "Adicionar" para criar novo
- Campos por item: nome, descrição, duração, valor
- Botão de remover por item
- Feedback visual de loading/saving

**Mudanças:**
- Remover dependência de `useClinicServices` / `useSaveClinicServices`
- Usar `useProcedures(clinicId)` para listar
- Cada ação (criar, editar, remover) é uma mutation independente (não mais "salvar tudo")
- Adicionar campo `category` (opcional, input text ou select com sugestões)
- Criar/editar via dialog ao invés de inline (mais consistente com o resto do app)
- Remover abre dialog de confirmação e chama `useDeactivateProcedure`

**Componente sugerido: `ProcedureFormDialog`**

Dialog com formulário React Hook Form + Zod:
- `name` — required, max 255
- `description` — optional, textarea
- `category` — optional, max 100 (sugestões: Consulta, Estético, Exame, Cirúrgico)
- `defaultDuration` — required, number input, min 5, max 480

**Nota sobre preço:** O modelo `Procedure` no backend NÃO tem campo de preço (preço está no vínculo médico↔procedimento via `DoctorProcedure.price`). Remover o campo "valor" da tab de procedimentos — ele será gerido por médico na task 06.

---

## Critérios de aceite

- [ ] API hooks criados em `procedures.api.ts`
- [ ] Services-tab reescrita consumindo API de procedures
- [ ] CRUD funcional: criar, editar (dialog), desativar (com confirmação)
- [ ] Campo `category` adicionado
- [ ] Campo "valor" removido (preço é por médico, não por procedimento)
- [ ] Loading states durante operações
- [ ] Toast de sucesso/erro nas mutations
