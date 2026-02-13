# Plano 04 - Enriquecimento da Página de Detalhe da Clínica

**Status:** Pendente
**Arquivo(s) a editar:** `routes/_authenticated/admin/clinics/$id.tsx`
**Arquivos a criar:** `features/platform-admin/components/clinics/clinic-users-table.tsx`

## Estado Atual

A página `/admin/clinics/$id` já tem:
- Info cards (ID, organização com link, status, datas)
- Botão de Transfer (já funcional)
- Formulário de edição inline

## O Que Adicionar

### 1. Botão de Ativar/Desativar no Header

Similar ao plano 03, usando `useUpdateClinicStatus` de `clinics-api.ts`:

```tsx
import { useUpdateClinicStatus } from '@/features/platform-admin/api/clinics-api'

const updateStatus = useUpdateClinicStatus()

// Payload: { status: 'inactive' | 'active', reason?: string }
// Para desativar: usar AlertDialog com confirmação
// Para ativar: direto (sem confirmação)
```

Posicionamento no header: ao lado do botão "Transferir" já existente.

### 2. Sub-tabela de Usuários da Clínica

Criar componente `ClinicUsersTable` que lista usuários filtrados por `clinicId`.

**Componente: `clinic-users-table.tsx`**

```tsx
interface ClinicUsersTableProps {
  clinicId: string
}

export function ClinicUsersTable({ clinicId }: ClinicUsersTableProps) {
  const { data, isLoading } = useUsers({ clinicId, limit: 50 })
  const navigate = useNavigate()

  // Colunas: Avatar+Nome, Email, Role, Email Verificado, Status, Ações
  // Ação: Ver Detalhes → /admin/users/$id
}
```

**Coluna de Role:** Usar o role do `user.clinics.find(c => c.clinicId === clinicId)?.role`

**Integração na página `$id.tsx`:**

```tsx
import { ClinicUsersTable } from '@/features/platform-admin/components/clinics/clinic-users-table'

// Após os cards de info:
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        Membros
      </CardTitle>
      <CardDescription>Usuários vinculados a esta clínica</CardDescription>
    </div>
  </CardHeader>
  <CardContent>
    <ClinicUsersTable clinicId={id} />
  </CardContent>
</Card>
```

### 3. Melhorar Link da Organização

O card de info já tem `Button variant="link"` para navegar para a org. Manter e garantir que está correto.

### Layout Final da Página

```
┌──────────────────────────────────────────────────────────────────┐
│ ← [Nome da Clínica]  [badge: Ativa]   [Transferir] [Desativar]  │
│   Detalhes e configurações da clínica                            │
├───────────────────────┬──────────────────────────────────────────┤
│ Informações Gerais    │ Datas                                    │
│ ID, Org (link), Status│ Criação, Atualização                     │
├───────────────────────┴──────────────────────────────────────────┤
│ Membros                                                          │
│ [tabela de usuários com nome, email, role, status, link]         │
├──────────────────────────────────────────────────────────────────┤
│ Editar Clínica                                                   │
│ [formulário de edição]                                           │
└──────────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `features/platform-admin/components/clinics/clinic-users-table.tsx` | Criar |
| `routes/_authenticated/admin/clinics/$id.tsx` | Modificar (status button + users table) |

## Detalhes Técnicos

- `useUsers` já aceita `clinicId` como filtro (`UserListParams.clinicId`) — usar direto
- Para mostrar o role do usuário nessa clínica específica: filtrar `user.clinics` pelo `clinicId`
- Ícone para membros: `Users` do lucide-react
- Botões no header em ordem: [Transferir] [Desativar/Ativar]
- `useUpdateClinicStatus` retorna toast automaticamente via mutation

## Resultado Esperado

- Header tem botões de Transfer + Ativar/Desativar lado a lado
- Página mostra membros vinculados à clínica
- Clicar em usuário navega para `/admin/users/$id`
- Role de cada usuário é mostrado no contexto da clínica
