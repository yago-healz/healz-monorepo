# 07 - Implementação do Dashboard Admin

[← Anterior: Login](./06-login-implementation.md) | [Índice](./00-index.md) | [Próximo: Cronograma →](./08-schedule-and-notes.md)

---

## 1. Layout Autenticado com Sidebar

### 1.1. Arquivo de Layout

**Arquivo:** `src/routes/_authenticated/_layout.tsx`

```typescript
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated/_layout')({
  beforeLoad: () => {
    if (!tokenService.hasValidToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
```

### 1.2. Estrutura do Layout

```
┌────────────────────────────────────────────┐
│              App Header                     │
├──────────┬─────────────────────────────────┤
│          │                                  │
│   App    │                                  │
│ Sidebar  │          Main Content            │
│          │           (Outlet)               │
│          │                                  │
│          │                                  │
└──────────┴─────────────────────────────────┘
```

---

## 2. Sidebar Component

### 2.1. Implementação Completa

**Arquivo:** `src/components/layout/app-sidebar.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import {
  Building2,
  Hospital,
  Users,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/features/auth/api/queries'
import { UserNav } from './user-nav'

const navigation = [
  {
    title: 'Platform Admin',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/platform-admin',
      },
      {
        title: 'Organizações',
        icon: Building2,
        href: '/platform-admin/organizations',
      },
      {
        title: 'Clínicas',
        icon: Hospital,
        href: '/platform-admin/clinics',
      },
      {
        title: 'Usuários',
        icon: Users,
        href: '/platform-admin/users',
      },
      {
        title: 'Admins',
        icon: Shield,
        href: '/platform-admin/admins',
      },
    ],
  },
  {
    title: 'Configurações',
    items: [
      {
        title: 'Perfil',
        icon: Settings,
        href: '/settings/profile',
      },
    ],
  },
]

export function AppSidebar() {
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hospital className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Healz</span>
            <span className="truncate text-xs">Platform Admin</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link to={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {user && <UserNav user={user} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
```

### 2.2. UserNav Component

**Arquivo:** `src/components/layout/user-nav.tsx`

```typescript
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useLogoutMutation } from '@/features/auth/api/mutations'
import type { User } from '@/types/api.types'

interface UserNavProps {
  user: User
}

export function UserNav({ user }: UserNavProps) {
  const logoutMutation = useLogoutMutation()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col text-left text-sm leading-tight">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 3. App Header

### 3.1. Implementação

**Arquivo:** `src/components/layout/app-header.tsx`

```typescript
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      {/* Breadcrumb will be added later */}
      <div className="flex flex-1 items-center justify-between">
        <div className="text-sm font-medium">Platform Admin</div>
      </div>
    </header>
  )
}
```

---

## 4. Dashboard Overview

### 4.1. Página Principal

**Arquivo:** `src/routes/_authenticated/platform-admin/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Hospital, Users, Activity } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/platform-admin/')({
  component: PlatformAdminDashboard,
})

function PlatformAdminDashboard() {
  // TODO: Fetch real stats from API
  const stats = [
    {
      title: 'Organizações',
      value: '24',
      icon: Building2,
      description: '+2 este mês',
    },
    {
      title: 'Clínicas',
      value: '156',
      icon: Hospital,
      description: '+12 este mês',
    },
    {
      title: 'Usuários',
      value: '1,429',
      icon: Users,
      description: '+89 este mês',
    },
    {
      title: 'Ativas',
      value: '98%',
      icon: Activity,
      description: 'Taxa de ativação',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma Healz
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TODO: Add charts and recent activity */}
    </div>
  )
}
```

---

## 5. Organizations Page

### 5.1. Organizations Table

**Arquivo:** `src/features/platform-admin/components/organizations/organizations-table.tsx`

```typescript
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, Edit, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrganizations } from '../../api/organizations-api'
import type { Organization } from '@/types/api.types'

export function OrganizationsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useOrganizations({
    page,
    limit: 20,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar organizações..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button asChild>
          <Link to="/platform-admin/organizations/new">
            Nova Organização
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Clínicas</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((org: Organization) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{org.slug}</TableCell>
                <TableCell>{org.clinicsCount || 0}</TableCell>
                <TableCell>{org.usersCount || 0}</TableCell>
                <TableCell>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                    {org.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/platform-admin/organizations/${org.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* TODO: Add pagination component */}
    </div>
  )
}
```

### 5.2. Organizations Page Route

**Arquivo:** `src/routes/_authenticated/platform-admin/organizations/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { OrganizationsTable } from '@/features/platform-admin/components/organizations/organizations-table'

export const Route = createFileRoute('/_authenticated/platform-admin/organizations/')({
  component: OrganizationsPage,
})

function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
        <p className="text-muted-foreground">
          Gerencie todas as organizações da plataforma
        </p>
      </div>

      <OrganizationsTable />
    </div>
  )
}
```

---

## 6. Clinics Page (Similar Structure)

### 6.1. Clinics Table

**Arquivo:** `src/features/platform-admin/components/clinics/clinics-table.tsx`

Estrutura similar ao `OrganizationsTable`, mas com:
- Filtro adicional por `organizationId`
- Coluna de `organizationName`
- Ação de "Transferir Clínica"

### 6.2. Clinics Page Route

**Arquivo:** `src/routes/_authenticated/platform-admin/clinics/index.tsx`

Similar ao `OrganizationsPage`.

---

## 7. Users Page (Similar Structure)

### 7.1. Users Table

**Arquivo:** `src/features/platform-admin/components/users/users-table.tsx`

Estrutura similar, mas com:
- Filtros avançados (role, emailVerified, status, clinic, organization)
- Coluna de clínicas do usuário
- Ações administrativas (reset password, verify email, impersonate)

### 7.2. Users Page Route

**Arquivo:** `src/routes/_authenticated/platform-admin/users/index.tsx`

Similar aos anteriores.

---

## 8. Estrutura de Rotas Completa

```
src/routes/
├── __root.tsx
├── index.tsx
│
├── _public.tsx                          # Layout público
│   ├── login.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   ├── verify-email.tsx
│   └── accept-invite.tsx
│
└── _authenticated/
    ├── _layout.tsx                      # Layout autenticado
    │
    ├── platform-admin/
    │   ├── index.tsx                    # Dashboard
    │   ├── organizations/
    │   │   ├── index.tsx                # Lista
    │   │   ├── $id.tsx                  # Detalhes
    │   │   └── new.tsx                  # Criar
    │   ├── clinics/
    │   │   ├── index.tsx
    │   │   ├── $id.tsx
    │   │   └── new.tsx
    │   └── users/
    │       ├── index.tsx
    │       ├── $id.tsx
    │       └── new.tsx
    │
    └── settings/
        └── profile.tsx
```

---

## 9. Checklist de Implementação

### Fase 3: Layout e Navegação (1-2 dias)

- [ ] Criar `src/routes/_authenticated/_layout.tsx`
- [ ] Criar `src/components/layout/app-sidebar.tsx`
- [ ] Criar `src/components/layout/user-nav.tsx`
- [ ] Criar `src/components/layout/app-header.tsx`
- [ ] Testar navegação e responsividade
- [ ] Testar sidebar collapsible

### Fase 4: Organizations (2-3 dias)

- [ ] Criar `src/features/platform-admin/components/organizations/organizations-table.tsx`
- [ ] Criar `src/routes/_authenticated/platform-admin/organizations/index.tsx`
- [ ] Implementar filtros e busca
- [ ] Implementar paginação
- [ ] Criar página de detalhes (`$id.tsx`)
- [ ] Criar página de criação (`new.tsx`)

### Fase 5: Clinics (2-3 dias)

- [ ] Criar `src/features/platform-admin/components/clinics/clinics-table.tsx`
- [ ] Criar `src/routes/_authenticated/platform-admin/clinics/index.tsx`
- [ ] Implementar filtros específicos
- [ ] Criar páginas de detalhes e criação

### Fase 6: Users (2-3 dias)

- [ ] Criar `src/features/platform-admin/components/users/users-table.tsx`
- [ ] Criar `src/routes/_authenticated/platform-admin/users/index.tsx`
- [ ] Implementar filtros avançados
- [ ] Implementar ações administrativas
- [ ] Criar páginas de detalhes e criação

### Fase 7: Dashboard Overview (1 dia)

- [ ] Implementar stats cards
- [ ] Criar gráficos (opcional)
- [ ] Implementar lista de atividades recentes

---

## 10. Próximos Passos

1. Revisar cronograma completo ([08 - Cronograma](./08-schedule-and-notes.md))
2. Planejar refinamentos e testes finais
3. Otimizar performance

---

[← Anterior: Login](./06-login-implementation.md) | [Índice](./00-index.md) | [Próximo: Cronograma →](./08-schedule-and-notes.md)
