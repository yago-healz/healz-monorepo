# Feature: Impersonation Banner — Indicador Visual e "Voltar ao Admin"

## Problema

Após impersonar um usuário o platform admin não tem como sair do modo de impersonação,
e não há nenhuma indicação visual de que está logado como outra pessoa.

## Contexto Técnico

### Fluxo atual de impersonação

`useImpersonateUser.onSuccess` (arquivo `apps/web/src/features/platform-admin/api/users-api.ts`):

```ts
tokenService.setAccessToken(data.accessToken);        // substitui o JWT do admin
tokenService.updateUserFromToken(data.accessToken);   // sobrescreve healz_user
window.location.href = redirectTo;                    // hard reload → sessão do admin perdida
```

O token e os dados do admin em localStorage são **destruídos** — sem possibilidade de restaurar.

### Keys de localStorage hoje
- `healz_access_token` — JWT ativo
- `healz_user` — dados do usuário atual (JSON)

## Solução

### Passo 1 — Salvar sessão original no tokenService

**Arquivo:** `apps/web/src/services/token.service.ts`

Adicionar dois novos pares chave/método:

```ts
const ORIGINAL_TOKEN_KEY = 'healz_original_token'
const ORIGINAL_USER_KEY  = 'healz_original_user'
```

Adicionar ao objeto `tokenService`:

```ts
saveOriginalSession(): void {
  const token = this.getAccessToken()
  const user  = this.getUser()
  if (token) localStorage.setItem(ORIGINAL_TOKEN_KEY, token)
  if (user)  localStorage.setItem(ORIGINAL_USER_KEY, JSON.stringify(user))
},

restoreOriginalSession(): void {
  const token = localStorage.getItem(ORIGINAL_TOKEN_KEY)
  const user  = localStorage.getItem(ORIGINAL_USER_KEY)
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
  if (user)  localStorage.setItem(USER_KEY, user)
  localStorage.removeItem(ORIGINAL_TOKEN_KEY)
  localStorage.removeItem(ORIGINAL_USER_KEY)
},

isImpersonating(): boolean {
  return !!localStorage.getItem(ORIGINAL_TOKEN_KEY)
},

getOriginalUser(): any | null {
  const user = localStorage.getItem(ORIGINAL_USER_KEY)
  return user ? JSON.parse(user) : null
},
```

Também atualizar `clearTokens()` para limpar as chaves originais:

```ts
clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ORIGINAL_TOKEN_KEY)   // NOVO
  localStorage.removeItem(ORIGINAL_USER_KEY)    // NOVO
},
```

---

### Passo 2 — Salvar sessão original antes de impersonar

**Arquivo:** `apps/web/src/features/platform-admin/api/users-api.ts`

No bloco `onSuccess` de `useImpersonateUser`, chamar `saveOriginalSession()` ANTES de
sobrescrever o token:

```ts
onSuccess: (data) => {
  tokenService.saveOriginalSession();                              // NOVO — salva admin original
  tokenService.setAccessToken(data.accessToken);
  tokenService.updateUserFromToken(data.accessToken);
  const impersonatedUser = tokenService.getUser();
  const redirectTo = impersonatedUser?.activeClinic ? '/clinic' : '/admin';
  window.location.href = redirectTo;
  toast.success('Agora você está logado como este usuário');
},
```

---

### Passo 3 — Criar componente ImpersonationBanner

**Novo arquivo:** `apps/web/src/components/layout/impersonation-banner.tsx`

Responsabilidades:
- Ler `tokenService.isImpersonating()` e `tokenService.getUser()`
- Se não estiver impersonando → retornar `null`
- Se estiver impersonando → exibir barra horizontal laranja/âmbar no topo

Visual da barra:
```
[ ⚠ Você está logado como  João Silva (joao@clinic.com)   [Encerrar Impersonação] ]
```

Comportamento do botão "Encerrar Impersonação":
1. Chamar `tokenService.restoreOriginalSession()`
2. `window.location.href = '/admin'`

Estilo: `bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm`

Ícone: `ShieldAlert` do `lucide-react`

```tsx
import { ShieldAlert } from 'lucide-react'
import { tokenService } from '@/services/token.service'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  if (!tokenService.isImpersonating()) return null

  const user = tokenService.getUser()

  function handleExit() {
    tokenService.restoreOriginalSession()
    window.location.href = '/admin'
  }

  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Você está logado como <strong>{user?.name}</strong>{' '}
          ({user?.email})
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-white bg-transparent text-white hover:bg-white hover:text-amber-600"
        onClick={handleExit}
      >
        Encerrar Impersonação
      </Button>
    </div>
  )
}
```

---

### Passo 4 — Incluir o banner nos layouts autenticados

A barra deve aparecer em **ambos** os layouts para cobrir o caso de admin impersonando outro admin.

#### `apps/web/src/routes/_authenticated/clinic.tsx`

Reestruturar o layout para que o banner fique acima do sidebar. Trocar o `<SidebarProvider>` como
wrapper externo por uma `<div className="flex h-screen flex-col">`, e colocar o `<SidebarProvider>`
dentro de um `<div className="flex flex-1 overflow-hidden">`:

```tsx
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'

function ClinicLayout() {
  return (
    <div className="flex h-screen flex-col">
      <ImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <ClinicSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
```

#### `apps/web/src/routes/_authenticated/admin.tsx`

Mesma reestruturação:

```tsx
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'

function AdminLayout() {
  return (
    <div className="flex h-screen flex-col">
      <ImpersonationBanner />
      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
```

---

## Arquivos a modificar/criar

| Ação | Arquivo |
|------|---------|
| Modificar | `apps/web/src/services/token.service.ts` |
| Modificar | `apps/web/src/features/platform-admin/api/users-api.ts` |
| **Criar** | `apps/web/src/components/layout/impersonation-banner.tsx` |
| Modificar | `apps/web/src/routes/_authenticated/clinic.tsx` |
| Modificar | `apps/web/src/routes/_authenticated/admin.tsx` |

Total: 4 modificações + 1 novo arquivo.

---

## Verificação

1. Login como platform admin → acessar `/admin/users`
2. Clicar em "Impersonar" em um usuário com clínica → confirmar
3. App redireciona para `/clinic` e exibe barra âmbar no topo
4. Barra mostra nome e email do usuário impersonado
5. Clicar em "Encerrar Impersonação"
6. App redireciona para `/admin` — barra some, dados do admin original restaurados
7. `localStorage.getItem('healz_original_token')` deve ser `null` após encerrar
8. Logout normal deve limpar também as chaves `healz_original_*`
