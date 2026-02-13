# Plano 01 - Table Actions e Navegação

**Status:** Pendente
**Arquivo(s) a editar:** `organizations-table.tsx`, `clinics-table.tsx`, `users-table.tsx`, páginas `index.tsx`

## Problema

1. Botão "Editar" nos dropdowns das tabelas é placeholder (não navega)
2. Status toggle (ativar/desativar) ausente nos dropdowns
3. Botões "Novo" foram removidos dos headers das páginas (ver commit `ddd36a5`)

## O Que Implementar

### 1. Wiring do botão "Editar"

Em cada tabela, no dropdown de ações, o item "Editar" deve navegar para `/$id`:

```tsx
// Padrão para organizations-table.tsx
import { useNavigate } from '@tanstack/react-router'

// Dentro do componente de linha:
const navigate = useNavigate()

// Item do dropdown:
<DropdownMenuItem onClick={() => navigate({ to: '/admin/organizations/$id', params: { id: org.id } })}>
  <Pencil className="mr-2 h-4 w-4" />
  Editar
</DropdownMenuItem>
```

Aplicar o mesmo padrão para `clinics-table.tsx` e `users-table.tsx`.

### 2. Status Toggle nos Dropdowns

Adicionar item de ativar/desativar em cada tabela usando as mutations existentes.

**Organizations table** (usar `useUpdateOrganizationStatus` de `organizations-api.ts`):
```tsx
import { useUpdateOrganizationStatus } from '@/features/platform-admin/api/organizations-api'

// Dentro do componente de linha (ou cell):
const updateStatus = useUpdateOrganizationStatus()

<DropdownMenuSeparator />
<DropdownMenuItem
  onClick={() => updateStatus.mutate({
    id: org.id,
    data: { status: org.status === 'active' ? 'inactive' : 'active' }
  })}
  className={org.status === 'active' ? 'text-destructive' : 'text-green-600'}
>
  {org.status === 'active' ? (
    <><BanIcon className="mr-2 h-4 w-4" /> Desativar</>
  ) : (
    <><CheckCircle className="mr-2 h-4 w-4" /> Ativar</>
  )}
</DropdownMenuItem>
```

**Clinics table** (usar `useUpdateClinicStatus` de `clinics-api.ts`) — mesmo padrão.

**Users table** (usar `useUpdateUserStatus` de `users-api.ts`):
```tsx
// Requer confirmação por causa de revokeTokens
// Usar AlertDialog para confirmar antes de desativar
// Payload: { status: 'inactive', revokeTokens: true, reason: 'Desativado pelo admin' }
```

### 3. Adicionar Botões "Novo" nas Páginas de Lista

Nas páginas `index.tsx` de organizations, clinics e users, adicionar botão no header que navega para `/new`:

```tsx
// apps/web/src/routes/_authenticated/admin/organizations/index.tsx
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// No header da página:
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
    <p className="text-muted-foreground">Gerencie as organizações do sistema</p>
  </div>
  <Button asChild>
    <Link to="/admin/organizations/new">
      <Plus className="mr-2 h-4 w-4" />
      Nova Organização
    </Link>
  </Button>
</div>
```

Aplicar para clinics (`Nova Clínica`) e users (`Novo Usuário`).

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `features/platform-admin/components/organizations/organizations-table.tsx` | Wire edit, adicionar status toggle |
| `features/platform-admin/components/clinics/clinics-table.tsx` | Wire edit, adicionar status toggle |
| `features/platform-admin/components/users/users-table.tsx` | Wire edit, adicionar status toggle (com confirmação) |
| `routes/_authenticated/admin/organizations/index.tsx` | Adicionar botão "Nova Organização" |
| `routes/_authenticated/admin/clinics/index.tsx` | Adicionar botão "Nova Clínica" |
| `routes/_authenticated/admin/users/index.tsx` | Adicionar botão "Novo Usuário" |

## Detalhes Técnicos

- Os hooks de mutations (`useUpdateOrganizationStatus`, etc.) já existem nos arquivos de API — importar direto
- `useNavigate` precisa ser chamado no nível do componente funcional, não dentro de callbacks de coluna
- Para status de usuário, **sempre** adicionar `AlertDialog` de confirmação (ação mais drástica)
- Para orgs e clínicas, pode ser toggle direto sem confirmação (menos destrutivo)
- Ícones sugeridos: `BanIcon` para desativar, `CheckCircle` para ativar (ambos no lucide-react)

## Resultado Esperado

- Clicar em "Editar" nas 3 tabelas navega para a página de detalhe
- Dropdown tem opção de ativar/desativar diretamente da lista
- Header das páginas de lista tem botão "Novo"
