# Tarefa 03 — Frontend: Camada de API (endpoints + tipos + hooks)

**Objetivo:** Criar os arquivos de endpoints, tipos TypeScript e hooks React Query para a feature de membros.

---

## Arquivos a criar

| Ação | Arquivo |
|------|---------|
| CRIAR | `apps/web/src/lib/api/clinic-members-endpoints.ts` |
| CRIAR | `apps/web/src/features/clinic/api/clinic-members.api.ts` |

---

## 1. `clinic-members-endpoints.ts`

Seguir o padrão de `clinic-settings-endpoints.ts`:

```typescript
export const CLINIC_MEMBERS_ENDPOINTS = {
  LIST: (clinicId: string) => `/clinics/${clinicId}/members`,
  ADD_EXISTING: (clinicId: string) => `/clinics/${clinicId}/members`,
  REMOVE: (clinicId: string, userId: string) => `/clinics/${clinicId}/members/${userId}`,
  UPDATE_ROLE: (clinicId: string, userId: string) => `/clinics/${clinicId}/members/${userId}`,
  RESEND_INVITE: (clinicId: string) => `/clinics/${clinicId}/members/resend-invite`,
  INVITE_NEW: () => `/invites`,
};
```

---

## 2. `clinic-members.api.ts` — Tipos

```typescript
export type ClinicMemberRole =
  | "admin"
  | "manager"
  | "doctor"
  | "receptionist"
  | "viewer";

export type ClinicMemberStatus = "active" | "inactive" | "pending";

export interface ClinicMember {
  userId: string;
  name: string;
  email: string;
  role: ClinicMemberRole;
  status: ClinicMemberStatus;
  emailVerified: boolean;
  joinedAt: string;
}

export interface ClinicMembersResponse {
  data: ClinicMember[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InviteNewMemberRequest {
  name: string;
  email: string;
  role: ClinicMemberRole;
}
```

---

## 3. `clinic-members.api.ts` — Hooks

Seguir o padrão de `clinic-settings.api.ts`: usar `tokenService.getActiveClinicId()` e `api` (Axios instance).

### `useClinicMembers`

```typescript
export function useClinicMembers(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const clinicId = tokenService.getActiveClinicId();
  return useQuery<ClinicMembersResponse>({
    queryKey: ["clinic-members", clinicId, params],
    queryFn: () =>
      api
        .get(CLINIC_MEMBERS_ENDPOINTS.LIST(clinicId!), { params })
        .then((r) => r.data),
    enabled: !!clinicId,
  });
}
```

### `useRemoveMember`

```typescript
export function useRemoveMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(CLINIC_MEMBERS_ENDPOINTS.REMOVE(clinicId!, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Membro removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover membro"),
  });
}
```

### `useUpdateMemberRole`

```typescript
export function useUpdateMemberRole() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ClinicMemberRole }) =>
      api.patch(CLINIC_MEMBERS_ENDPOINTS.UPDATE_ROLE(clinicId!, userId), { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Cargo atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar cargo"),
  });
}
```

### `useResendInvite`

```typescript
export function useResendInvite() {
  const clinicId = tokenService.getActiveClinicId();
  return useMutation({
    mutationFn: (email: string) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.RESEND_INVITE(clinicId!), { email }),
    onSuccess: () => toast.success("Convite reenviado com sucesso!"),
    onError: () => toast.error("Erro ao reenviar convite"),
  });
}
```

### `useInviteNewMember`

```typescript
export function useInviteNewMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: InviteNewMemberRequest) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.INVITE_NEW(), { ...dto, clinicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Convite enviado com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar convite"),
  });
}
```

### `useAddExistingMember`

```typescript
export function useAddExistingMember() {
  const clinicId = tokenService.getActiveClinicId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { userId: string; role: ClinicMemberRole }) =>
      api.post(CLINIC_MEMBERS_ENDPOINTS.ADD_EXISTING(clinicId!), dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members", clinicId] });
      toast.success("Membro adicionado com sucesso!");
    },
    onError: () => toast.error("Erro ao adicionar membro"),
  });
}
```

---

## Imports necessários no arquivo

```typescript
import api from "@/lib/api/axios";
import { CLINIC_MEMBERS_ENDPOINTS } from "@/lib/api/clinic-members-endpoints";
import { tokenService } from "@/services/token.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
```

---

## Pronto quando

- `useClinicMembers` aceita `{ search, page, limit }` e retorna `ClinicMembersResponse` tipado
- Todos os 5 hooks de mutação invalidam a query `["clinic-members", clinicId]` no `onSuccess`
- Não há referência a dados mocados
