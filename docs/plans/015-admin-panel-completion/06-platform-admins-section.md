# Plano 06 - Seção de Platform Admins

**Status:** Pendente
**Arquivos a criar:**
- `features/platform-admin/api/platform-admins-api.ts`
- `features/platform-admin/components/platform-admins/platform-admins-table.tsx`
- `features/platform-admin/components/platform-admins/promote-admin-dialog.tsx`
- `routes/_authenticated/admin/platform-admins/index.tsx`
**Arquivos a modificar:**
- `components/layout/app-sidebar.tsx` (adicionar item de menu)
- `types/api.types.ts` (verificar se PlatformAdmin já tem todos os campos)

## Contexto da API

```
GET  /api/v1/platform-admin/admins        → lista platform admins
POST /api/v1/platform-admin/admins        → { userId: string } → promove usuário existente
DELETE /api/v1/platform-admin/admins/{id} → revoga permissões
```

**Tipo já existente em `api.types.ts`:**
```typescript
export interface PlatformAdmin {
  id: string
  userId: string
  userName: string
  userEmail: string
  createdAt: string
}
```

## O Que Implementar

### 1. API Layer

**`features/platform-admin/api/platform-admins-api.ts`:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { toast } from 'sonner'
import type { PlatformAdmin, CreatePlatformAdminDto } from '@/types/api.types'

export function usePlatformAdmins() {
  return useQuery({
    queryKey: ['platform-admin', 'admins'],
    queryFn: async () => {
      const { data } = await api.get<PlatformAdmin[]>(ENDPOINTS.PLATFORM_ADMIN.ADMINS.LIST)
      return data
    },
  })
}

export function usePromotePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreatePlatformAdminDto) => {
      const { data } = await api.post(ENDPOINTS.PLATFORM_ADMIN.ADMINS.CREATE, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'admins'] })
      toast.success('Usuário promovido a Platform Admin!')
    },
    onError: () => toast.error('Erro ao promover usuário'),
  })
}

export function useRevokePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ENDPOINTS.PLATFORM_ADMIN.ADMINS.REVOKE(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'admins'] })
      toast.success('Permissões revogadas com sucesso!')
    },
    onError: () => toast.error('Erro ao revogar permissões'),
  })
}
```

### 2. Adicionar Endpoints em `endpoints.ts`

Verificar se `ENDPOINTS.PLATFORM_ADMIN.ADMINS` já existe. Se não, adicionar:

```typescript
ADMINS: {
  LIST: '/platform-admin/admins',
  CREATE: '/platform-admin/admins',
  REVOKE: (id: string) => `/platform-admin/admins/${id}`,
},
```

### 3. Tabela de Platform Admins

**`features/platform-admin/components/platform-admins/platform-admins-table.tsx`:**

```
Colunas:
1. Nome (userName)
2. Email (userEmail)
3. Promovido em (createdAt — formatado)
4. Ações → [Revogar] (com AlertDialog de confirmação)
```

Layout compacto — é uma lista pequena, sem paginação, sem search. Usar `Table` do Shadcn.

```tsx
export function PlatformAdminsTable() {
  const { data: admins, isLoading } = usePlatformAdmins()
  const revoke = useRevokePlatformAdmin()

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!admins?.length) return <EmptyState message="Nenhum platform admin cadastrado" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Desde</TableHead>
          <TableHead className="w-[80px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.id}>
            <TableCell className="font-medium">{admin.userName}</TableCell>
            <TableCell className="text-muted-foreground">{admin.userEmail}</TableCell>
            <TableCell>{format(new Date(admin.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
            <TableCell>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar permissões de {admin.userName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {admin.userName} perderá acesso ao painel de platform admin imediatamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => revoke.mutate(admin.id)}
                    >
                      Revogar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### 4. Dialog: Promover Usuário a Admin

**`features/platform-admin/components/platform-admins/promote-admin-dialog.tsx`:**

Dialog com `Combobox` (command + popover) para buscar e selecionar um usuário existente pelo nome/email.

```
[Abrir Dialog]
  ↳ Campo de busca com Combobox (users list via useUsers)
  ↳ Selecionar usuário
  ↳ Botão "Promover a Platform Admin"
```

```tsx
export function PromoteAdminDialog() {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const { data: usersData } = useUsers({ limit: 100, status: 'active' })
  const promote = usePromotePlatformAdmin()

  const handlePromote = async () => {
    await promote.mutateAsync({ userId: selectedUserId })
    setOpen(false)
    setSelectedUserId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promover Usuário a Platform Admin</DialogTitle>
          <DialogDescription>
            Selecione um usuário existente para conceder permissões de platform admin.
          </DialogDescription>
        </DialogHeader>

        {/* Combobox de seleção de usuário */}
        <div className="space-y-2">
          <Label>Usuário</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {selectedUserId
                  ? usersData?.data?.find(u => u.id === selectedUserId)?.name
                  : "Selecionar usuário..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar usuário..." />
                <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                <CommandList>
                  {usersData?.data?.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.name} ${user.email}`}
                      onSelect={() => setSelectedUserId(user.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={handlePromote}
            disabled={!selectedUserId || promote.isPending}
          >
            {promote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Promover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 5. Página Principal

**`routes/_authenticated/admin/platform-admins/index.tsx`:**

```tsx
export const Route = createFileRoute('/_authenticated/admin/platform-admins/')({
  component: PlatformAdminsPage,
})

function PlatformAdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Admins</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários com permissões de administrador da plataforma
          </p>
        </div>
        <PromoteAdminDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Administradores Ativos
          </CardTitle>
          <CardDescription>
            Usuários com acesso total ao painel de administração da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformAdminsTable />
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6. Sidebar — Adicionar Item de Menu

Em `components/layout/app-sidebar.tsx`, adicionar item na navegação do admin:

```tsx
{
  title: 'Platform Admins',
  url: '/admin/platform-admins',
  icon: ShieldCheck,
}
```

Localizar onde estão os itens `Organizations`, `Clinics`, `Users` e adicionar após.

## Componentes Shadcn Necessários

Verificar se já existem, instalar se não:
- `Dialog` → `npx shadcn@latest add dialog`
- `Popover` → `npx shadcn@latest add popover`
- `Command` → já existe (`src/components/ui/command.tsx`)
- `Label` → `npx shadcn@latest add label`

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `features/platform-admin/api/platform-admins-api.ts` | Criar |
| `features/platform-admin/components/platform-admins/platform-admins-table.tsx` | Criar |
| `features/platform-admin/components/platform-admins/promote-admin-dialog.tsx` | Criar |
| `routes/_authenticated/admin/platform-admins/index.tsx` | Criar |
| `lib/api/endpoints.ts` | Adicionar ADMINS endpoints se ausentes |
| `components/layout/app-sidebar.tsx` | Adicionar item de menu |

## Resultado Esperado

- Nova seção "Platform Admins" no sidebar
- Página lista todos os admins atuais em tabela
- Botão "Adicionar Admin" abre dialog com busca de usuários
- Revogar permissões com confirmação
- Feedback visual (toast) em todas as ações
