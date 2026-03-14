# 03 — Formas de Pagamento

**Objetivo:** Criar API hooks e uma nova tab "Pagamentos" nas configurações da clínica com CRUD de formas de pagamento.

**Depende de:** 01 (endpoints + tipos)

---

## Arquivos a criar

### `apps/web/src/features/clinic/api/payment-methods.api.ts`

**Queries:**
- `usePaymentMethods(clinicId)` — `GET /clinics/:clinicId/payment-methods` → `PaymentMethod[]`

**Mutations:**
- `useCreatePaymentMethod()` — `POST /clinics/:clinicId/payment-methods`
- `useUpdatePaymentMethod()` — `PATCH /clinics/:clinicId/payment-methods/:id`
- `useDeactivatePaymentMethod()` — `DELETE /clinics/:clinicId/payment-methods/:id`

**Cache keys:** `['payment-methods', clinicId]`

### `apps/web/src/features/clinic/components/settings/tabs/payment-methods-tab.tsx`

**Layout:** Card com lista de payment methods + botão "Adicionar".

**Cada item exibe:**
- Nome
- Tipo (badge com label traduzido)
- Instruções (texto secundário, se houver)
- Ações: editar, desativar

**Labels para tipos:**
| Valor | Label |
|-------|-------|
| `pix` | PIX |
| `credit_card` | Cartão de Crédito |
| `debit_card` | Cartão de Débito |
| `cash` | Dinheiro |
| `insurance` | Convênio |
| `bank_transfer` | Transferência Bancária |

**Dialog de criação/edição (React Hook Form + Zod):**
- `name` — required, max 100
- `type` — required, select com os 6 tipos
- `instructions` — optional, textarea

**Ação de desativar:** Dialog de confirmação → mutation.

---

## Arquivos a modificar

### `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx`

Adicionar nova tab ao array `tabs`:

```typescript
{ id: 'pagamentos', label: 'Pagamentos', icon: CreditCard }
```

Renderizar `<PaymentMethodsTab />` quando `activeTab === 'pagamentos'`.

### `apps/web/src/routes/_authenticated/clinic/settings.tsx`

Adicionar `'pagamentos'` ao `TAB_IDS` (array Zod de validação do search param).

---

## Critérios de aceite

- [ ] API hooks criados em `payment-methods.api.ts`
- [ ] Nova tab "Pagamentos" visível nas configurações da clínica
- [ ] CRUD funcional: criar, editar (dialog), desativar (com confirmação)
- [ ] Tipos exibidos com labels traduzidos
- [ ] Loading states e toasts nas mutations
