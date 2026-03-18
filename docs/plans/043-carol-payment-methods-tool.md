# Plano 043 — Carol: Tool de Formas de Pagamento

**Objetivo:** Permitir que a Carol responda perguntas sobre formas de pagamento aceitas pela clínica, criando uma nova tool `get_payment_methods`.

---

## Contexto

Hoje a Carol possui 5 tools, mas nenhuma acessa as formas de pagamento cadastradas na tabela `payment_methods`. Quando um paciente pergunta "quais formas de pagamento vocês aceitam?", a Carol não consegue responder.

As formas de pagamento já existem no sistema:
- **Tabela:** `payment_methods` (clinic_id, type, name, instructions, is_active)
- **Service:** `PaymentMethodsService.findAll(clinicId)` retorna todas as formas
- **Tipos:** pix, credit_card, debit_card, cash, insurance, bank_transfer

A tool `GetServicesTool` é o melhor modelo a seguir — acessa o banco diretamente via `db` (sem injetar service), sem parâmetros de input.

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| **Criar** | `apps/api/src/modules/carol/tools/get-payment-methods.tool.ts` |
| **Modificar** | `apps/api/src/modules/carol/chat/carol-chat.service.ts` |
| **Modificar** | `docs/CAROL_AI_ASSISTANT.md` |

> **Nota:** Não é necessário modificar `carol.module.ts` nem importar `PaymentMethodsModule`. A tool acessa o banco diretamente via `db` (padrão usado por `GetServicesTool`).

## Implementação

### 1. Criar `GetPaymentMethodsTool`

**Arquivo:** `apps/api/src/modules/carol/tools/get-payment-methods.tool.ts`

Seguir o padrão exato de `GetServicesTool`:

```typescript
import { StructuredTool } from '@langchain/core/tools'
import { Logger } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../infrastructure/database'
import { paymentMethods } from '../../../infrastructure/database/schema'

export class GetPaymentMethodsTool extends StructuredTool {
  name = 'get_payment_methods'
  description = 'Lista as formas de pagamento aceitas pela clínica (PIX, cartão de crédito, débito, dinheiro, convênio, etc.)'
  schema = z.object({})

  private readonly logger = new Logger(GetPaymentMethodsTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(): Promise<string> {
    this.logger.debug(`Fetching payment methods for clinic ${this.clinicId}`)

    const rows = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.clinicId, this.clinicId),
          eq(paymentMethods.isActive, true),
        ),
      )

    const methods = rows.map((row) => ({
      type: row.type,
      name: row.name,
      ...(row.instructions && { instructions: row.instructions }),
    }))

    this.logger.debug(`Found ${methods.length} payment methods for clinic ${this.clinicId}`)
    return JSON.stringify({ paymentMethods: methods })
  }
}
```

**Decisões:**
- Filtrar apenas `isActive = true` (paciente não precisa ver métodos desativados)
- Retornar `type`, `name` e `instructions` (se existir) — informação suficiente para a Carol formular resposta
- Sem parâmetros de input (lista tudo, como `get_services`)

### 2. Registrar no `CarolChatService`

**Arquivo:** `apps/api/src/modules/carol/chat/carol-chat.service.ts`

Adicionar import e instância no método `createTools()`:

```typescript
// Import (linha ~15)
import { GetPaymentMethodsTool } from '../tools/get-payment-methods.tool'

// No método createTools() (linha ~244)
private createTools(clinicId: string): StructuredTool[] {
  return [
    new GetClinicInfoTool(clinicId, this.clinicSettingsService),
    new GetServicesTool(clinicId),
    new GetOperatingHoursTool(clinicId, this.clinicSettingsService),
    new CheckAvailabilityTool(clinicId, this.clinicSettingsService, this.googleCalendarService),
    new CreateAppointmentTool(clinicId),
    new GetPaymentMethodsTool(clinicId),  // ← Nova tool
  ]
}
```

### 3. Atualizar documentação

**Arquivo:** `docs/CAROL_AI_ASSISTANT.md`

Adicionar `get_payment_methods` na tabela de tools (linha ~206) e atualizar contadores de "5 tools" para "6 tools".

## Ordem de execução

1. **Tarefa 1** — Criar `get-payment-methods.tool.ts`
2. **Tarefa 2** — Registrar no `carol-chat.service.ts` (depende de 1)
3. **Tarefa 3** — Atualizar documentação (paralelo com 2)

## Teste

```bash
curl -X POST http://localhost:3001/api/v1/clinics/{clinicId}/carol/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quais formas de pagamento vocês aceitam?", "version": "draft"}'
```

Esperado: Carol usa `get_payment_methods` e responde com as formas ativas da clínica.

## Fora do escopo

- Alterações no schema/tabela `payment_methods`
- Alterações no `PaymentMethodsService` ou `PaymentMethodsModule`
- Informações de preço/parcelamento por serviço (seria uma integração entre tools)
- RAG ou busca semântica
