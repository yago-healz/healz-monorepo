# 03 - Componentes Shadcn/UI

[← Anterior: Configuração Inicial](./02-initial-configuration.md) | [Índice](./00-index.md) | [Próximo: Auth Queries →](./04-queries-mutations-auth-orgs.md)

---

## 1. Componentes Já Instalados

O projeto já possui **~60 componentes Shadcn/UI** instalados em `src/components/ui/`:

### 1.1. Lista Completa

- ✅ **accordion** - Painéis expansíveis
- ✅ **alert** - Mensagens de alerta
- ✅ **alert-dialog** - Diálogos de confirmação
- ✅ **avatar** - Avatar de usuário
- ✅ **breadcrumb** - Navegação breadcrumb
- ✅ **button** - Botões
- ✅ **card** - Cards/containers
- ✅ **carousel** - Carrossel de imagens
- ✅ **checkbox** - Checkboxes
- ✅ **dialog** - Modais/diálogos
- ✅ **drawer** - Painéis laterais deslizantes
- ✅ **dropdown-menu** - Menus dropdown
- ✅ **form** - Componentes de formulário
- ✅ **field** - Campos de formulário
- ✅ **input** - Inputs de texto
- ✅ **input-group** - Grupos de inputs
- ✅ **label** - Labels
- ✅ **popover** - Popovers
- ✅ **progress** - Barras de progresso
- ✅ **radio-group** - Grupos de radio buttons
- ✅ **scroll-area** - Áreas com scroll customizado
- ✅ **select** - Selects/dropdowns
- ✅ **separator** - Separadores/dividers
- ✅ **sheet** - Painéis laterais
- ✅ **sidebar** - Sidebar de navegação
- ✅ **table** - Tabelas
- ✅ **tabs** - Abas/tabs
- ✅ **toast** - Notificações toast
- ✅ **toaster** - Container de toasts
- ✅ **tooltip** - Tooltips

E muitos outros...

---

## 2. Componentes Adicionais Necessários

Para completar a implementação, precisamos instalar alguns componentes adicionais:

### 2.1. Badge

**Para:** Status indicators (active/inactive, roles, etc)

```bash
npx shadcn@latest add badge
```

**Uso:**
```typescript
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Error</Badge>
```

### 2.2. Calendar

**Para:** Date pickers em formulários

```bash
npx shadcn@latest add calendar
```

**Uso:**
```typescript
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

### 2.3. Command

**Para:** Command palette / search functionality

```bash
npx shadcn@latest add command
```

**Uso:**
```typescript
<Command>
  <CommandInput placeholder="Buscar..." />
  <CommandList>
    <CommandGroup heading="Sugestões">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search Emoji</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### 2.4. Data Table

**Para:** Tabelas avançadas com sorting, filtering, pagination

```bash
npx shadcn@latest add data-table
```

**Uso:** Ver exemplo completo na seção 3.3

### 2.5. Skeleton

**Para:** Loading states

```bash
npx shadcn@latest add skeleton
```

**Uso:**
```typescript
<Skeleton className="h-4 w-full" />
<Skeleton className="h-12 w-12 rounded-full" />
```

### 2.6. Switch

**Para:** Toggle switches (ativar/desativar features)

```bash
npx shadcn@latest add switch
```

**Uso:**
```typescript
<Switch
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
/>
```

### 2.7. Comando para Instalar Todos

```bash
npx shadcn@latest add badge calendar command data-table skeleton switch
```

---

## 3. Blocks do Shadcn/UI a Utilizar

### 3.1. Login Page Block

**Usar para:** Tela de login

**Componentes:**
- Card, CardHeader, CardTitle, CardDescription
- CardContent, CardFooter
- Input, Label, Button

**Exemplo de Estrutura:**
```typescript
<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle className="text-2xl">Login</CardTitle>
    <CardDescription>
      Entre com seu email e senha
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" />
        </div>
      </div>
    </form>
  </CardContent>
  <CardFooter>
    <Button className="w-full">Entrar</Button>
  </CardFooter>
</Card>
```

### 3.2. Dashboard Sidebar Block

**Usar para:** Sidebar de navegação com menu colapsável

**Componentes:**
- Sidebar, SidebarProvider
- SidebarHeader, SidebarContent, SidebarFooter
- SidebarMenu, SidebarMenuItem, SidebarMenuButton

**Exemplo de Estrutura:**
```typescript
<SidebarProvider>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <div className="flex items-center gap-2 px-4 py-2">
        <Hospital className="size-4" />
        <span>Healz Platform</span>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Platform Admin</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/platform-admin">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <UserNav />
    </SidebarFooter>
  </Sidebar>
</SidebarProvider>
```

### 3.3. Data Tables Block

**Usar para:** Tabelas de Organizations, Clinics, Users

**Componentes:**
- Table, TableHeader, TableBody
- TableRow, TableHead, TableCell
- DataTablePagination (após instalar data-table)

**Exemplo de Estrutura:**
```typescript
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nome</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Ações</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data?.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">{item.name}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>
            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Editar</DropdownMenuItem>
                <DropdownMenuItem>Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

<DataTablePagination table={table} />
```

### 3.4. Form Block

**Usar para:** Formulários de criação/edição (Organization, Clinic, User)

**Componentes:**
- Form, FormField, FormItem, FormLabel
- FormControl, FormMessage, FormDescription
- Input, Select, Checkbox, etc.

**Exemplo com React Hook Form:**
```typescript
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nome</FormLabel>
          <FormControl>
            <Input placeholder="Digite o nome" {...field} />
          </FormControl>
          <FormDescription>
            Nome completo da organização
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />

    <Button type="submit">Salvar</Button>
  </form>
</Form>
```

---

## 4. Padrões de Uso

### 4.1. Cards para Estatísticas (Dashboard)

```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">
      Total de Organizações
    </CardTitle>
    <Building2 className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">24</div>
    <p className="text-xs text-muted-foreground">
      +2 este mês
    </p>
  </CardContent>
</Card>
```

### 4.2. Dialog para Confirmações

```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. Isso irá excluir
        permanentemente a organização.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4.3. Toast para Feedback

```typescript
import { toast } from 'sonner'

// Sucesso
toast.success('Organização criada com sucesso!')

// Erro
toast.error('Erro ao criar organização')

// Info
toast.info('Email de verificação enviado')

// Loading
toast.loading('Salvando...')
```

### 4.4. Skeleton para Loading States

```typescript
function OrganizationsTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Uso
function OrganizationsPage() {
  const { data, isLoading } = useOrganizations()

  if (isLoading) {
    return <OrganizationsTableSkeleton />
  }

  return <OrganizationsTable data={data} />
}
```

---

## 5. Customização de Componentes

### 5.1. Variantes de Botões

```typescript
// Primary
<Button>Salvar</Button>

// Secondary
<Button variant="secondary">Cancelar</Button>

// Destructive
<Button variant="destructive">Excluir</Button>

// Outline
<Button variant="outline">Editar</Button>

// Ghost
<Button variant="ghost">Ver detalhes</Button>

// Link
<Button variant="link">Saiba mais</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="default">Normal</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>
```

### 5.2. Variantes de Badge

```typescript
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Suspended</Badge>
<Badge variant="outline">Pending</Badge>
```

### 5.3. Status Badge Helper

Criar helper para badges de status:

```typescript
// src/components/ui/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import type { Status } from '@/types/api.types'

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
      {status === 'active' ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}
```

---

## 6. Ícones com Lucide React

### 6.1. Ícones Principais

Já instalado: `lucide-react`

```typescript
import {
  Building2,      // Organizações
  Hospital,       // Clínicas
  Users,          // Usuários
  User,           // Usuário individual
  Settings,       // Configurações
  LayoutDashboard, // Dashboard
  Shield,         // Admin/Segurança
  Mail,           // Email
  Lock,           // Senha/Segurança
  Search,         // Busca
  Filter,         // Filtros
  Plus,           // Adicionar
  Edit,           // Editar
  Trash,          // Excluir
  Eye,            // Ver detalhes
  MoreHorizontal, // Menu de ações
  ChevronDown,    // Dropdown
  Check,          // Confirmação
  X,              // Fechar/Cancelar
  AlertCircle,    // Alerta
  Info,           // Informação
  LogOut,         // Logout
  RefreshCw,      // Atualizar
} from 'lucide-react'
```

### 6.2. Uso em Componentes

```typescript
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Nova Organização
</Button>

<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle>Usuários</CardTitle>
    <Users className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
</Card>
```

---

## 7. Checklist de Instalação

### Fase 1.6: Instalar Componentes Adicionais

- [ ] Instalar badge: `npx shadcn@latest add badge`
- [ ] Instalar calendar: `npx shadcn@latest add calendar`
- [ ] Instalar command: `npx shadcn@latest add command`
- [ ] Instalar data-table: `npx shadcn@latest add data-table`
- [ ] Instalar skeleton: `npx shadcn@latest add skeleton`
- [ ] Instalar switch: `npx shadcn@latest add switch`
- [ ] Criar componente StatusBadge customizado
- [ ] Testar todos os componentes novos

---

## 8. Recursos Úteis

### Documentação Oficial
- [Shadcn/UI Docs](https://ui.shadcn.com)
- [Shadcn/UI Components](https://ui.shadcn.com/docs/components)
- [Shadcn/UI Blocks](https://ui.shadcn.com/blocks)

### Exemplos de Uso
- [Login Page Block](https://ui.shadcn.com/blocks#authentication-01)
- [Dashboard Block](https://ui.shadcn.com/blocks#dashboard-01)
- [Data Table Block](https://ui.shadcn.com/blocks#table-01)

---

## 9. Próximos Passos

Após instalar os componentes Shadcn/UI:

1. Implementar queries e mutations de Auth ([04 - Auth Queries](./04-queries-mutations-auth-orgs.md))
2. Criar tela de login usando os componentes ([06 - Login](./06-login-implementation.md))
3. Construir dashboard com sidebar ([07 - Dashboard](./07-dashboard-implementation.md))

---

[← Anterior: Configuração Inicial](./02-initial-configuration.md) | [Índice](./00-index.md) | [Próximo: Auth Queries →](./04-queries-mutations-auth-orgs.md)
