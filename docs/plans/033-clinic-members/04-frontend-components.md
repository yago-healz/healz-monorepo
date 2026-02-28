# Tarefa 04 — Frontend: Componentes e Wiring

**Objetivo:** Substituir os dados mocados por dados reais, criar os dois dialogs e conectar tudo na página de membros.

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| MODIFICAR | `apps/web/src/features/clinic/components/members/members-table.tsx` |
| CRIAR | `apps/web/src/features/clinic/components/members/remove-member-dialog.tsx` |
| CRIAR | `apps/web/src/features/clinic/components/members/invite-member-dialog.tsx` |
| MODIFICAR | `apps/web/src/routes/_authenticated/clinic/members.tsx` |

---

## 1. `members-table.tsx` — Substituir mock por dados reais

### Remover
- `mockMembers` array e filtro local `filtered`
- Paginação hardcoded (botões `[1, 2, 3]` e texto `"Mostrando 1-4 de 24 membros"`)

### Adicionar

```typescript
import { useClinicMembers, useRemoveMember, useResendInvite } from "@/features/clinic/api/clinic-members.api";
import { useDebounce } from "@/hooks/use-debounce"; // verificar se existe; se não, implementar inline com useEffect+setTimeout
import { Skeleton } from "@/components/ui/skeleton";
import type { ClinicMember } from "@/features/clinic/api/clinic-members.api";
```

**State e hooks:**

```typescript
const [search, setSearch] = useState("");
const [debouncedSearch] = useDebounce(search, 300);
const [page, setPage] = useState(1);
const [memberToRemove, setMemberToRemove] = useState<ClinicMember | null>(null);

const { data, isLoading } = useClinicMembers({ search: debouncedSearch, page, limit: 20 });
const resendInvite = useResendInvite();
```

**Labels de cargo:**

```typescript
const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  doctor: "Médico",
  receptionist: "Recepcionista",
  viewer: "Visualizador",
};
```

**Skeleton de loading (substituir `{filtered.map(...)}` quando `isLoading`):**

```tsx
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-8 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  ))
) : (
  data?.data.map((member) => (
    <TableRow key={member.userId}>
      {/* ... células existentes usando member.name, member.email, roleLabels[member.role], member.status */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.status === "pending" && (
              <DropdownMenuItem
                onClick={() => resendInvite.mutate(member.email)}
                disabled={resendInvite.isPending}
              >
                Reenviar convite
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setMemberToRemove(member)}
            >
              Remover membro
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  ))
)}
```

**Paginação real (substituir paginação hardcoded):**

```tsx
<div className="flex items-center justify-between border-t px-4 py-3">
  <span className="text-sm text-muted-foreground">
    Mostrando {data?.data.length ?? 0} de {data?.meta.total ?? 0} membros
  </span>
  <div className="flex items-center gap-1">
    <Button
      variant="ghost" size="sm"
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
    >
      Anterior
    </Button>
    <span className="text-sm px-2">{page} / {data?.meta.totalPages ?? 1}</span>
    <Button
      variant="ghost" size="sm"
      onClick={() => setPage((p) => p + 1)}
      disabled={page >= (data?.meta.totalPages ?? 1)}
    >
      Próximo
    </Button>
  </div>
</div>
```

**Dialog de remoção no final do JSX:**

```tsx
<RemoveMemberDialog
  member={memberToRemove}
  open={!!memberToRemove}
  onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
/>
```

---

## 2. `remove-member-dialog.tsx` — Dialog de confirmação

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoveMember } from "@/features/clinic/api/clinic-members.api";
import type { ClinicMember } from "@/features/clinic/api/clinic-members.api";

interface RemoveMemberDialogProps {
  member: ClinicMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveMemberDialog({ member, open, onOpenChange }: RemoveMemberDialogProps) {
  const removeMember = useRemoveMember();

  function handleConfirm() {
    if (!member) return;
    removeMember.mutate(member.userId, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{member?.name}</strong> da clínica?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={removeMember.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

> Verificar se `AlertDialog` está disponível em `@/components/ui/alert-dialog`. Se não, usar `Dialog` comum com dois botões.

---

## 3. `invite-member-dialog.tsx` — Dialog de convite com duas abas

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInviteNewMember, useAddExistingMember } from "@/features/clinic/api/clinic-members.api";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Gerente" },
  { value: "doctor", label: "Médico" },
  { value: "receptionist", label: "Recepcionista" },
  { value: "viewer", label: "Visualizador" },
];

const newUserSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "manager", "doctor", "receptionist", "viewer"]),
});

const existingUserSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "manager", "doctor", "receptionist", "viewer"]),
});

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const inviteNew = useInviteNewMember();
  const addExisting = useAddExistingMember();

  const newForm = useForm({ resolver: zodResolver(newUserSchema) });
  const existingForm = useForm({ resolver: zodResolver(existingUserSchema) });

  function handleInviteNew(values: z.infer<typeof newUserSchema>) {
    inviteNew.mutate(values, { onSuccess: () => { newForm.reset(); onOpenChange(false); } });
  }

  function handleAddExisting(values: z.infer<typeof existingUserSchema>) {
    // NOTE: O endpoint POST /clinics/{id}/members espera userId, não email.
    // Para MVP: mostrar campo de email mas informar que o usuário deve já existir.
    // Alternativamente, o backend pode aceitar email e resolver internamente — confirmar com backend.
    // Por ora, deixar placeholder de busca por email (não implementado neste plano).
    addExisting.mutate(
      { userId: values.email, role: values.role }, // placeholder — ajustar quando lookup de userId estiver disponível
      { onSuccess: () => { existingForm.reset(); onOpenChange(false); } }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="new">
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">Novo usuário</TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">Já tem conta</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 pt-2">
            <form onSubmit={newForm.handleSubmit(handleInviteNew)} className="space-y-4">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input {...newForm.register("name")} placeholder="Nome completo" />
                {newForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{newForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input {...newForm.register("email")} type="email" placeholder="email@clinica.com" />
                {newForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{newForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Cargo *</Label>
                <Select onValueChange={(v) => newForm.setValue("role", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={inviteNew.isPending}>
                Enviar convite
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 pt-2">
            <form onSubmit={existingForm.handleSubmit(handleAddExisting)} className="space-y-4">
              <div className="space-y-1">
                <Label>Email do usuário *</Label>
                <Input {...existingForm.register("email")} type="email" placeholder="email@clinica.com" />
                {existingForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{existingForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Cargo *</Label>
                <Select onValueChange={(v) => existingForm.setValue("role", v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addExisting.isPending}>
                Adicionar membro
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

> **Nota sobre "Já tem conta":** O endpoint `POST /clinics/{id}/members` atual recebe `userId`. Para o MVP, verificar com o backend se pode receber `email` para resolver internamente, ou implementar um endpoint auxiliar de lookup. Se não for possível, deixar o campo de email com uma nota para o usuário.

---

## 4. `members.tsx` — Wiring do dialog

```tsx
import { useState } from "react";
import { InviteMemberDialog } from "@/features/clinic/components/members/invite-member-dialog";

function MembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground max-w-md">
            Gerencie os acessos da sua equipe e coordene a jornada do paciente
            com permissões granulares.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar membro
        </Button>
      </div>
      <MembersTable />
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
```

---

## Dependências a verificar

| Item | Verificar |
|------|-----------|
| `useDebounce` hook | Existe em `src/hooks/`? Se não, criar simples com `useEffect` |
| `AlertDialog` | Existe em `src/components/ui/alert-dialog`? Se não, usar `Dialog` |
| `Tabs` | Existe em `src/components/ui/tabs`? |

---

## Pronto quando

- Tabela carrega membros reais com skeleton durante loading
- Busca por nome/email chama API com debounce (não filtra localmente)
- Paginação funciona com `meta.total` e `meta.totalPages` reais
- Status `"pending"` mostra badge amarelo; ação "Reenviar convite" visível apenas para pending
- "Remover membro" abre `RemoveMemberDialog` e remove via API
- Botão "Convidar membro" abre `InviteMemberDialog` com aba "Novo usuário" e "Já tem conta"
- Sem `mockMembers` no código
