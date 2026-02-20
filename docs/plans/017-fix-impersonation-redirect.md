# Fix: Impersonação não funciona — usuário é redirecionado de volta ao /admin

## Problema

Ao clicar em "Impersonar" na tela `/admin/users`, o usuário é brevemente
redirecionado para `/clinic` e imediatamente enviado de volta para `/admin`.
A impersonação não tem efeito visível.

## Causa Raiz

O fluxo atual em `useImpersonateUser.onSuccess` (`users-api.ts` linha 203):

```ts
onSuccess: (data) => {
  tokenService.setAccessToken(data.accessToken);  // ✅ salva o novo JWT
  window.location.href = "/clinic";               // ❌ não atualiza healz_user
  toast.success("Agora você está logado como este usuário");
},
```

Após o `window.location.href`, o app recarrega. O TanStack Router executa
`beforeLoad` no layout `clinic.tsx`:

```ts
beforeLoad: () => {
  const user = tokenService.getUser(); // lê healz_user do localStorage
  if (!user?.activeClinic) {           // admin não tem activeClinic → true
    throw redirect({ to: '/admin' });  // redireciona de volta!
  }
},
```

`healz_user` no localStorage **nunca foi atualizado** — ainda contém os dados
do platform admin (sem `activeClinic`), então a guard do `/clinic` rejeita e
redireciona para `/admin`.

## Contexto Técnico

- `tokenService.setAccessToken(token)` → salva `healz_access_token`
- `tokenService.getUser()` → lê `healz_user` (separado do token)
- `tokenService.updateUserFromToken(token)` → **já existe** — decodifica o JWT
  e atualiza `healz_user` com os dados do usuário impersonado (incluindo
  `activeClinic`)
- O JWT de impersonação retornado pela API contém:
  `userId`, `email`, `organizationId`, `activeClinicId`, `clinicAccess[]`

## Solução

**Arquivo:** `apps/web/src/features/platform-admin/api/users-api.ts`

Alterar `useImpersonateUser.onSuccess` para:
1. Salvar o access token (já feito)
2. Chamar `tokenService.updateUserFromToken(data.accessToken)` para decodificar
   o JWT e atualizar `healz_user` com os dados do usuário impersonado
3. Ler o usuário atualizado e decidir o destino do redirect:
   - Se tiver `activeClinic` → `/clinic`
   - Caso contrário → `/admin` (impersonando outro platform admin)

```ts
onSuccess: (data) => {
  tokenService.setAccessToken(data.accessToken);
  tokenService.updateUserFromToken(data.accessToken);        // NOVO
  const impersonatedUser = tokenService.getUser();           // NOVO
  const redirectTo = impersonatedUser?.activeClinic ? '/clinic' : '/admin'; // NOVO
  window.location.href = redirectTo;
  toast.success("Agora você está logado como este usuário");
},
```

## Implementação

### Arquivo único a modificar

**`apps/web/src/features/platform-admin/api/users-api.ts`** — função
`useImpersonateUser` (linha ~195):

Substituir o bloco `onSuccess` atual:
```ts
onSuccess: (data) => {
  tokenService.setAccessToken(data.accessToken);
  window.location.href = "/clinic";
  toast.success("Agora você está logado como este usuário");
},
```

Por:
```ts
onSuccess: (data) => {
  tokenService.setAccessToken(data.accessToken);
  tokenService.updateUserFromToken(data.accessToken);
  const impersonatedUser = tokenService.getUser();
  const redirectTo = impersonatedUser?.activeClinic ? '/clinic' : '/admin';
  window.location.href = redirectTo;
  toast.success("Agora você está logado como este usuário");
},
```

Nenhum outro arquivo precisa ser alterado.

## Verificação

1. Autenticar como platform admin em `/admin/users`
2. Clicar no menu "..." de um usuário com clínica associada → "Impersonar"
3. Confirmar o dialog
4. Verificar que o app redireciona para `/clinic` e permanece lá
5. Verificar que `localStorage.getItem('healz_user')` contém os dados do
   usuário impersonado (com `activeClinic` preenchido)
6. Verificar que `localStorage.getItem('healz_access_token')` contém o novo JWT
