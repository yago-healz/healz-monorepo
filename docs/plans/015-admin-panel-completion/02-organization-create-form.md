# Plano 02 - Formulário de Criação de Organização

**Status:** Pendente
**Arquivo(s) a editar:** `organization-form.tsx`, `organizations-api.ts`

## Problema

A API `POST /api/v1/platform-admin/organizations` requer campos obrigatórios que o formulário atual **não possui**:
- `initialClinic: { name: string }` — clínica inicial da organização
- `initialAdmin: { name: string; email: string; sendInvite: boolean }` — admin inicial

O formulário atual só envia `name`, `slug` e `status`, o que pode causar erro ou criar uma organização sem clínica/admin.

## O Que Implementar

### Estratégia: Form Condicional por Modo

O componente `OrganizationForm` já suporta modo create/edit via prop `organization?`. Expandir o schema Zod e os campos **apenas para criação** (quando `organization` é undefined).

### Schema Zod Expandido

```typescript
// Campos base (shared)
const baseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  status: z.enum(['active', 'inactive']),
})

// Schema de criação (inclui initialClinic + initialAdmin)
const createSchema = baseSchema.extend({
  initialClinic: z.object({
    name: z.string().min(3, 'Nome da clínica deve ter no mínimo 3 caracteres'),
  }),
  initialAdmin: z.object({
    name: z.string().min(3, 'Nome do admin deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    sendInvite: z.boolean().default(true),
  }),
})

// Schema de edição (apenas base)
const editSchema = baseSchema
```

### Novos Campos no Form (apenas na criação)

Adicionar seção visual separada por `Separator` com título "Clínica Inicial" e "Admin Inicial":

```
┌─────────────────────────────────────┐
│ Dados da Organização                │
│   • Nome                            │
│   • Slug (auto-gerado)              │
│   • Status                          │
├─────────────────────────────────────┤
│ Clínica Inicial                     │  ← só no create
│   • Nome da Clínica                 │
├─────────────────────────────────────┤
│ Admin Inicial                       │  ← só no create
│   • Nome do Admin                   │
│   • Email do Admin                  │
│   • Enviar convite? (Switch)        │
└─────────────────────────────────────┘
```

### Implementação do Layout de Seções

```tsx
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

// No JSX, após os campos base, adicionar quando !organization:
{!organization && (
  <>
    <Separator />
    <div>
      <h3 className="text-sm font-medium mb-4">Clínica Inicial</h3>
      <FormField name="initialClinic.name" ... />
    </div>

    <Separator />
    <div>
      <h3 className="text-sm font-medium mb-4">Admin Inicial</h3>
      <FormField name="initialAdmin.name" ... />
      <FormField name="initialAdmin.email" ... />
      <FormField name="initialAdmin.sendInvite" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <FormLabel>Enviar convite por email</FormLabel>
            <FormDescription>O admin receberá um email para definir sua senha</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />
    </div>
  </>
)}
```

### Ajuste na Rota `/new`

A rota `organizations/new.tsx` precisa passar os dados corretamente:

```typescript
// O handleSubmit recebe o form data completo (incluindo initialClinic e initialAdmin)
// Não precisa de mudança se OrganizationForm passa todos os campos para onSubmit
```

### Verificar API

O endpoint retorna `{ organization, clinic, admin, invite }` conforme documentado. A mutation `useCreateOrganization` deve invalidar as queries de organizations.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `features/platform-admin/components/organizations/organization-form.tsx` | Adicionar seções de initialClinic e initialAdmin condicionais |

## Detalhes Técnicos

- Usar `z.discriminatedUnion` ou schemas separados (`createSchema` / `editSchema`) — escolha mais simples é `baseSchema.extend({})` condicionalmente
- O `useForm` pode receber `resolver: zodResolver(organization ? editSchema : createSchema)`
- O `Switch` componente já existe em `src/components/ui/switch.tsx`
- O `Separator` pode precisar ser instalado: `npx shadcn@latest add separator`

## Resultado Esperado

- Criar organização via UI funciona corretamente (envia initialClinic + initialAdmin)
- Editar organização continua funcionando sem mostrar campos desnecessários
- Layout visual limpo com seções separadas
