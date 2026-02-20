# Plano: Fix Criar Clínica + UX do Seletor de Admin Inicial

## Problema 1: Erro 400 ao criar clínica sem admin inicial

**Root cause:** O formulário envia `initialAdminId: ""` (string vazia) no body. O DTO do backend tem `@IsOptional() @IsUUID()`, mas `@IsOptional()` só ignora validação quando o valor é `null` ou `undefined` — string vazia `""` falha no `@IsUUID()`.

**Fix:** Duas camadas de proteção:
1. **Backend (DTO):** Adicionar `@Transform` para converter `""` em `undefined`.
2. **Frontend (form):** Omitir `initialAdminId` do payload se vazio.

## Problema 2: UX ruim — input de UUID

**Root cause:** O campo `initialAdminId` é um `<Input>` de texto livre, forçando o usuário a copiar/colar um UUID.

**Fix:** Substituir por um combobox com busca de usuários (nome + email), que internamente armazena o UUID do usuário selecionado.

---

## Arquivos a modificar

### 1. Backend DTO — `apps/api/src/platform-admin/dto/clinics/create-clinic.dto.ts`

Adicionar `@Transform` antes de `@IsOptional()` no campo `initialAdminId`:

```ts
import { Transform } from 'class-transformer';

@Transform(({ value }) => value === '' ? undefined : value)
@IsOptional()
@IsUUID()
initialAdminId?: string;
```

> `class-transformer` já é dependência do NestJS — não precisa instalar.

---

### 2. Novo componente — `apps/web/src/features/platform-admin/components/users/user-search-combobox.tsx`

Combobox com busca de usuários. Especificações:

- **Props:**
  ```ts
  interface UserSearchComboboxProps {
    value: string        // UUID do usuário selecionado (ou "")
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
  }
  ```

- **Comportamento:**
  - Abre um `Popover` com um `Command` (shadcn) ao clicar no botão trigger.
  - O `CommandInput` faz busca debounced (300ms) via `useUsers({ search, limit: 20, page: 1 })`.
  - Cada item lista `user.name` (linha principal) + `user.email` (linha secundária, texto muted).
  - Ao selecionar um item, chama `onChange(user.id)` e fecha o popover.
  - O botão trigger exibe o nome do usuário selecionado ou o placeholder.
  - Tem botão "X" para limpar a seleção (chama `onChange("")`).
  - Enquanto carrega (`isLoading`), exibe um skeleton ou spinner no `CommandEmpty`.

- **Imports necessários** (todos já existem no projeto):
  - `Popover, PopoverContent, PopoverTrigger` de `@/components/ui/popover`
  - `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList` de `@/components/ui/command`
  - `useUsers` de `../../api/users-api`
  - `useState` do react (controle do estado `open` e `search`)
  - `useDebounce` — **não existe ainda**, implementar inline com `useEffect` + `useState` dentro do próprio componente

- **Estrutura do componente:**
  ```tsx
  export function UserSearchCombobox({ value, onChange, placeholder = "Buscar usuário...", disabled }: UserSearchComboboxProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // debounce 300ms
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedSearch(search), 300)
      return () => clearTimeout(timer)
    }, [search])

    const { data, isLoading } = useUsers({ search: debouncedSearch, limit: 20, page: 1 })
    const users = data?.data ?? []

    // encontrar usuário selecionado para exibir nome no trigger
    const selectedUser = users.find(u => u.id === value)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" ...>
            {selectedUser ? selectedUser.name : placeholder}
            {value && <X onClick={() => onChange('')} />}
            <ChevronsUpDown ... />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar por nome ou email..." />
            <CommandList>
              {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
              {!isLoading && users.length === 0 && <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>}
              <CommandGroup>
                {users.map(user => (
                  <CommandItem key={user.id} value={user.id} onSelect={() => { onChange(user.id); setOpen(false) }}>
                    <div>
                      <p>{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Check className={cn("ml-auto", value === user.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
  ```

---

### 3. Formulário — `apps/web/src/features/platform-admin/components/clinics/clinic-form.tsx`

Três mudanças:

**a) Schema Zod:** Simplificar `initialAdminId` — remover `or(z.literal(''))`:
```ts
// antes:
initialAdminId: z.string().uuid().optional().or(z.literal(''))

// depois:
initialAdminId: z.string().uuid().optional()
```

**b) Campo `initialAdminId`:** Substituir o `<Input>` pelo `<UserSearchCombobox>`:
```tsx
// antes:
<Input placeholder="ID do usuário (opcional)" {...field} />

// depois:
<UserSearchCombobox
  value={field.value ?? ''}
  onChange={field.onChange}
/>
```

**c) Submit handler:** No `handleSubmit` interno (ou via `transform` no Zod), garantir que `initialAdminId` seja omitido quando vazio:
```ts
const handleFormSubmit = (values: ClinicFormValues) => {
  const payload = { ...values }
  if (!payload.initialAdminId) delete payload.initialAdminId
  return onSubmit(payload)
}
// usar handleFormSubmit no lugar de onSubmit no form.handleSubmit(...)
```

---

## Resumo das mudanças

| Arquivo | Tipo | Mudança |
|---|---|---|
| `apps/api/src/platform-admin/dto/clinics/create-clinic.dto.ts` | Modificar | `@Transform` em `initialAdminId` |
| `apps/web/src/features/platform-admin/components/users/user-search-combobox.tsx` | Criar | Combobox de busca de usuários |
| `apps/web/src/features/platform-admin/components/clinics/clinic-form.tsx` | Modificar | Usar `UserSearchCombobox`, ajustar schema e submit handler |

## Dependências

Nenhuma nova dependência a instalar. Todos os componentes shadcn necessários (`Popover`, `Command`) já estão presentes no projeto.
