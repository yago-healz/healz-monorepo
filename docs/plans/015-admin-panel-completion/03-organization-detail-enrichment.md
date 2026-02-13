# Plano 03 - Enriquecimento da Página de Detalhe da Organização

**Status:** Pendente
**Arquivo(s) a editar:** `routes/_authenticated/admin/organizations/$id.tsx`
**Arquivos a criar:** `features/platform-admin/components/organizations/organization-clinics-table.tsx`

## Estado Atual

A página `/admin/organizations/$id` já tem:
- Info cards (ID, slug, status, datas)
- Formulário de edição inline

## O Que Adicionar

### 1. Botão de Ativar/Desativar no Header

Adicionar action button no canto direito do header, junto à badge de status:

```tsx
import { useUpdateOrganizationStatus } from '@/features/platform-admin/api/organizations-api'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
         AlertDialogTrigger } from '@/components/ui/alert-dialog'

const updateStatus = useUpdateOrganizationStatus()

// No header (ao lado da badge de status):
{organization.status === 'active' ? (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="sm">
        <BanIcon className="mr-2 h-4 w-4" />
        Desativar
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Desativar organização?</AlertDialogTitle>
        <AlertDialogDescription>
          Isso desativará "{organization.name}" e todas as suas clínicas. Os usuários não conseguirão fazer login.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => updateStatus.mutate({ id, data: { status: 'inactive' } })}
        >
          Desativar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
) : (
  <Button
    variant="outline"
    size="sm"
    onClick={() => updateStatus.mutate({ id, data: { status: 'active' } })}
  >
    <CheckCircle className="mr-2 h-4 w-4" />
    Ativar
  </Button>
)}
```

### 2. Sub-tabela de Clínicas da Organização

Criar componente `OrganizationClinicsTable` que lista as clínicas filtradas por `organizationId`.

**Componente: `organization-clinics-table.tsx`**

```tsx
interface OrganizationClinicsTableProps {
  organizationId: string
}

export function OrganizationClinicsTable({ organizationId }: OrganizationClinicsTableProps) {
  const { data, isLoading } = useClinics({ organizationId, limit: 50 })
  const navigate = useNavigate()

  // Tabela simples com colunas: Nome, Status, Data Criação, Ações
  // Ação: Ver Detalhes → /admin/clinics/$id
  // Sem paginação por ora (limite 50)
}
```

**Integração na página `$id.tsx`:**

```tsx
import { OrganizationClinicsTable } from '@/features/platform-admin/components/organizations/organization-clinics-table'

// Adicionar após os cards de info, antes do form de edição:
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <Building className="h-5 w-5" />
        Clínicas
      </CardTitle>
      <CardDescription>Clínicas vinculadas a esta organização</CardDescription>
    </div>
    <Button asChild size="sm">
      <Link to="/admin/clinics/new">
        <Plus className="mr-2 h-4 w-4" />
        Nova Clínica
      </Link>
    </Button>
  </CardHeader>
  <CardContent>
    <OrganizationClinicsTable organizationId={id} />
  </CardContent>
</Card>
```

### Layout Final da Página

```
┌─────────────────────────────────────────────────────────────┐
│ ← [Nome da Org]  [badge: Ativa]          [Desativar] [...]  │
│   Detalhes e configurações da organização                   │
├──────────────────────┬──────────────────────────────────────┤
│ Informações Gerais   │ Datas                                │
│ ID, Slug, Status     │ Criação, Atualização                 │
├──────────────────────┴──────────────────────────────────────┤
│ Clínicas                                      [Nova Clínica]│
│ [tabela de clínicas com link para cada uma]                 │
├─────────────────────────────────────────────────────────────┤
│ Editar Organização                                          │
│ [formulário de edição]                                      │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `features/platform-admin/components/organizations/organization-clinics-table.tsx` | Criar |
| `routes/_authenticated/admin/organizations/$id.tsx` | Modificar (adicionar status button + clinics table) |

## Detalhes Técnicos

- `useClinics` já aceita `organizationId` como filtro — usar direto
- `AlertDialog` precisa ser importado de `@/components/ui/alert-dialog` — verificar se o componente já existe; se não, instalar: `npx shadcn@latest add alert-dialog`
- A tabela interna de clínicas NÃO precisa de search/pagination (é contextual)
- Loading state: `Skeleton` para os cards e para a sub-tabela
- Ícone `BanIcon` está no lucide-react como `Ban`

## Resultado Esperado

- Header da página tem botão de ativar/desativar com confirmação
- Página mostra lista de clínicas vinculadas
- Botão "Nova Clínica" na seção de clínicas
- Clicar em clínica navega para `/admin/clinics/$id`
