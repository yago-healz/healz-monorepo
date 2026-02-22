# Plano 032 — Notificações: Multi-canal e múltiplos telefones

**Objetivo:** Permitir selecionar WhatsApp e e-mail simultaneamente como canais de alerta, e cadastrar múltiplos números de telefone destino.

---

## Contexto

Atualmente a aba de notificações usa um toggle exclusivo (WhatsApp **ou** e-mail) e aceita um único número de telefone. A mudança exige:

- `alertChannel: 'whatsapp' | 'email'` → `alertChannels: ('whatsapp' | 'email')[]`
- `phoneNumber?: string` → `phoneNumbers?: string[]`

Isso impacta banco, DTO, service e frontend.

---

## Arquivos afetados

| Camada | Arquivo | Ação |
|---|---|---|
| DB Schema | `apps/api/src/infrastructure/database/schema/clinic-settings.schema.ts` | Modificar colunas |
| Migration | `apps/api/src/infrastructure/database/migrations/` | Gerar via Drizzle |
| DTO | `apps/api/src/modules/clinic-settings/dto/clinic-notifications.dto.ts` | Atualizar tipos |
| Service | `apps/api/src/modules/clinic-settings/clinic-settings.service.ts` | Sem mudanças lógicas, mas verificar tipagem |
| FE Types | `apps/web/src/types/onboarding.ts` | Atualizar `AlertChannel` e `Step4Data` |
| FE API | `apps/web/src/features/clinic/api/clinic-settings.api.ts` | Atualizar interfaces e hooks |
| FE Component | `apps/web/src/features/clinic/components/settings/tabs/notifications-tab.tsx` | Redesenhar seções de canal e telefone |

---

## Implementação

### 1. Backend — Schema (DB)

**Arquivo:** `clinic-settings.schema.ts`

Substituir as colunas:

```typescript
// ANTES
alertChannel: varchar('alert_channel', { length: 20 }).notNull().default('whatsapp'),
phoneNumber: varchar('phone_number', { length: 20 }),

// DEPOIS
alertChannels: jsonb('alert_channels').notNull().default(['whatsapp']),
phoneNumbers: jsonb('phone_numbers').notNull().default([]),
```

### 2. Backend — Migration

Executar o workflow Drizzle para gerar e aplicar a migration:

```bash
cd apps/api
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

A migration deve:
1. Adicionar coluna `alert_channels` jsonb com default `'["whatsapp"]'`
2. Adicionar coluna `phone_numbers` jsonb com default `'[]'`
3. Popular `alert_channels` com `json_build_array(alert_channel)` (migrar dado existente)
4. Popular `phone_numbers` com `json_build_array(phone_number)` WHERE `phone_number IS NOT NULL`
5. Dropar as colunas antigas `alert_channel` e `phone_number`

> **Atenção:** Se preferir uma migration manual, criar o arquivo SQL diretamente. A instrução exata de migração de dados:
> ```sql
> UPDATE clinic_notifications
>   SET alert_channels = json_build_array(alert_channel)::jsonb,
>       phone_numbers = CASE WHEN phone_number IS NOT NULL
>                       THEN json_build_array(phone_number)::jsonb
>                       ELSE '[]'::jsonb END;
> ```

### 3. Backend — DTO

**Arquivo:** `clinic-notifications.dto.ts`

```typescript
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator'

export class ClinicNotificationsDto {
  @IsObject()
  notificationSettings: NotificationSettings

  @IsArray()
  @IsIn(['whatsapp', 'email'], { each: true })
  alertChannels: ('whatsapp' | 'email')[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phoneNumbers?: string[]
}

export class GetClinicNotificationsResponseDto {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannels: ('whatsapp' | 'email')[]
  phoneNumbers?: string[]
  createdAt: Date
  updatedAt?: Date
}
```

### 4. Backend — Service

**Arquivo:** `clinic-settings.service.ts`

Atualizar os campos no `update` e `insert`:

```typescript
// set/values block
{
  notificationSettings: dto.notificationSettings,
  alertChannels: dto.alertChannels,
  phoneNumbers: dto.phoneNumbers ?? [],
  updatedAt: new Date(),
}
```

### 5. Frontend — Tipos

**Arquivo:** `apps/web/src/types/onboarding.ts`

```typescript
// ANTES
export type AlertChannel = 'whatsapp' | 'email'

export interface Step4Data {
  notifications: NotificationSettings
  alertChannel: AlertChannel
  phoneNumber: string
}

// DEPOIS
export type AlertChannel = 'whatsapp' | 'email'

export interface Step4Data {
  notifications: NotificationSettings
  alertChannels: AlertChannel[]
  phoneNumbers: string[]
}
```

### 6. Frontend — API Hook

**Arquivo:** `clinic-settings.api.ts` (seção NOTIFICATIONS)

Atualizar `ClinicNotificationsResponse` e `useSaveClinicNotifications`:

```typescript
export interface ClinicNotificationsResponse {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannels: ('whatsapp' | 'email')[]
  phoneNumbers?: string[]
  createdAt: string
  updatedAt?: string
}

// Na mutation:
mutationFn: async (data: {
  notificationSettings: NotificationSettings
  alertChannels: ('whatsapp' | 'email')[]
  phoneNumbers?: string[]
}) => { ... }
```

### 7. Frontend — Componente UI

**Arquivo:** `notifications-tab.tsx`

**Estado:**
```typescript
const [alertChannels, setAlertChannels] = useState<AlertChannel[]>(['whatsapp'])
const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])
```

**Carregamento (`useEffect`):**
```typescript
setAlertChannels(savedData.alertChannels ?? ['whatsapp'])
setPhoneNumbers(savedData.phoneNumbers?.length ? savedData.phoneNumbers : [''])
```

**Seção "Receber alertas via..." — substituir o toggle por checkboxes:**

```tsx
<div className="flex gap-4">
  {(['whatsapp', 'email'] as const).map((channel) => (
    <label key={channel} className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
      <Checkbox
        checked={alertChannels.includes(channel)}
        onCheckedChange={(checked) =>
          setAlertChannels((prev) =>
            checked ? [...prev, channel] : prev.filter((c) => c !== channel)
          )
        }
        className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
      />
      <span className="text-sm text-foreground capitalize">{channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
    </label>
  ))}
</div>
```

**Seção "Números de Telefone" — lista com add/remove:**

```tsx
<div className="space-y-3">
  {phoneNumbers.map((phone, index) => (
    <div key={index} className="flex items-center gap-2">
      <div className="flex flex-1 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-r border-border text-sm text-muted-foreground">+55</div>
        <Input
          type="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => {
            const updated = [...phoneNumbers]
            updated[index] = e.target.value
            setPhoneNumbers(updated)
          }}
          className="border-0 rounded-none focus-visible:ring-0"
        />
      </div>
      {phoneNumbers.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPhoneNumbers((prev) => prev.filter((_, i) => i !== index))}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  ))}
  <Button
    variant="outline"
    size="sm"
    onClick={() => setPhoneNumbers((prev) => [...prev, ''])}
    className="mt-1"
  >
    <Plus className="w-4 h-4 mr-2" />
    Adicionar número
  </Button>
</div>
```

**Salvar (`handleSave`):**
```typescript
saveNotifications({
  notificationSettings: notifications,
  alertChannels,
  phoneNumbers: phoneNumbers.filter(Boolean), // remove vazios
})
```

**Imports adicionais no componente:** `Trash2, Plus` de `lucide-react`.

---

## Ordem de execução

```
1. [Task 1] Schema DB — atualizar colunas (bloqueante para migration)
2. [Task 2] Migration — gerar e aplicar (depende de 1)
3. [Task 3] DTO + Service — atualizar tipagem e campos (pode rodar em paralelo com 2 se migration for aplicada primeiro em dev)
4. [Task 4] FE Types — atualizar onboarding.ts (independente, pode rodar em paralelo com 1-3)
5. [Task 5] FE API Hook — atualizar clinic-settings.api.ts (depende de 4)
6. [Task 6] FE Component — redesenhar notifications-tab.tsx (depende de 5)
```

Paralelo possível: **Tasks 3 + 4** podem rodar ao mesmo tempo após a migration ser aplicada.

---

## Critérios de aceite

- [ ] É possível selecionar WhatsApp, Email, ou ambos simultaneamente
- [ ] Pelo menos um canal deve estar selecionado (validação client-side)
- [ ] É possível adicionar N números de telefone (campo vazio inicial, botão "+ Adicionar número")
- [ ] É possível remover números (botão trash, oculto quando há só 1 número)
- [ ] Números vazios são filtrados antes de salvar
- [ ] Dados carregam corretamente ao abrir a aba (backward compatible com dados antigos migrados)
- [ ] Salvar exibe toast de sucesso e persiste no banco

---

## Fora do escopo

- Validação de formato do número de telefone (máscaras já existentes ficam)
- Campo de email destino (notificações de email são disparadas para o email do admin da clínica)
- Alterações no flow de onboarding (Step4)
- Testes automatizados
