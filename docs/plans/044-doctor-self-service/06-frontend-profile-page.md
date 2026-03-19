# 06 — Frontend: Rota /clinic/profile + Sidebar + Adaptar Componentes

**Objetivo:** Criar a pagina de perfil do doctor com 3 tabs, adicionar link na sidebar, e adaptar componentes para self-view.

**Depende de:** 05 (hooks prontos)

## Arquivos

**Criar:**
- `apps/web/src/routes/_authenticated/clinic/profile.tsx`

**Modificar:**
- `apps/web/src/components/layout/clinic-sidebar.tsx` — adicionar "Meu Perfil" para doctors
- `apps/web/src/features/clinic/components/doctors/doctor-profile-card.tsx` — prop `isSelfView`
- `apps/web/src/features/clinic/components/doctors/doctor-schedule-tab.tsx` — (sem alteracao, ja funciona com doctorId)
- `apps/web/src/features/clinic/components/doctors/doctor-procedures-tab.tsx` — prop `isSelfView` + botao criar

## 1. Sidebar

Em `clinic-sidebar.tsx`, adicionar secao para doctors:

```typescript
const navigation = [
  ...(canManageClinic
    ? [{ title: 'Principal', items: [
        { title: 'Membros', icon: Users, href: '/clinic/members', exact: false },
        { title: 'Medicos', icon: Stethoscope, href: '/clinic/doctors', exact: false },
      ]}]
    : []),

  // NOVO: secao do doctor
  ...(isDoctor
    ? [{ title: 'Meu Espaco', items: [
        { title: 'Meu Perfil', icon: UserCircle, href: '/clinic/profile', exact: false },
      ]}]
    : []),

  { title: 'Clinica', items: [
    { title: 'Pacientes', icon: Users, href: '/clinic/patients', exact: false },
    { title: 'Agenda', icon: CalendarDays, href: '/clinic/schedule', exact: false },
  ]},

  ...(canManageClinic
    ? [{ title: 'Carol', items: [
        { title: 'Carol', icon: Bot, href: '/clinic/carol/settings', exact: false },
      ]}]
    : []),
];
```

Importar `UserCircle` de `lucide-react` e `isDoctor` de `useUserRole()`.

## 2. Rota /clinic/profile

```typescript
// apps/web/src/routes/_authenticated/clinic/profile.tsx
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { tokenService } from '@/services/token.service'
import { useMyDoctorProfile } from '@/features/clinic/api/doctors.api'
import { DoctorProfileCard } from '@/features/clinic/components/doctors/doctor-profile-card'
import { DoctorScheduleTab } from '@/features/clinic/components/doctors/doctor-schedule-tab'
import { DoctorProceduresTab } from '@/features/clinic/components/doctors/doctor-procedures-tab'

const searchSchema = z.object({
  tab: z.enum(['perfil', 'agenda', 'procedimentos']).optional().catch('perfil'),
})

export const Route = createFileRoute('/_authenticated/clinic/profile')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'doctor') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: searchSchema,
  component: DoctorProfilePage,
})

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'procedimentos', label: 'Procedimentos' },
] as const

type TabId = (typeof tabs)[number]['id']

function DoctorProfilePage() {
  const { tab: activeTab = 'perfil' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: doctor, isLoading } = useMyDoctorProfile()

  function handleTabChange(tabId: TabId) {
    navigate({ search: (prev) => ({ ...prev, tab: tabId }), replace: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Perfil medico nao encontrado.</p>
        <p className="text-sm">Entre em contato com o administrador da clinica.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">{doctor.specialty ?? 'Sem especialidade'}</p>
      </div>

      <Separator />

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'perfil' && <DoctorProfileCard doctorId={doctor.id} isSelfView />}
          {activeTab === 'agenda' && <DoctorScheduleTab doctorId={doctor.id} />}
          {activeTab === 'procedimentos' && <DoctorProceduresTab doctorId={doctor.id} isSelfView />}
        </div>
      </div>
    </div>
  )
}
```

## 3. Adaptar DoctorProfileCard

Adicionar prop `isSelfView?: boolean` (default `false`).

Quando `isSelfView === true`:
- **Esconder** o card "Vinculo com a Clinica" inteiro, OU
- **Esconder** apenas o `Switch` de isActive e manter a duracao/notas editaveis

Recomendacao: esconder apenas o Switch de isActive + mudar titulo para "Minhas Configuracoes".

```diff
 interface DoctorProfileCardProps {
   doctorId: string
+  isSelfView?: boolean
 }

-export function DoctorProfileCard({ doctorId }: DoctorProfileCardProps) {
+export function DoctorProfileCard({ doctorId, isSelfView = false }: DoctorProfileCardProps) {
   // ...

   // No card de vinculo, esconder o switch de isActive:
-  <div className="flex items-center gap-3 pt-6">
-    <Switch checked={isActive} onCheckedChange={setIsActive} />
-    <Label>{isActive ? 'Vinculo ativo' : 'Vinculo inativo'}</Label>
-  </div>
+  {!isSelfView && (
+    <div className="flex items-center gap-3 pt-6">
+      <Switch checked={isActive} onCheckedChange={setIsActive} />
+      <Label>{isActive ? 'Vinculo ativo' : 'Vinculo inativo'}</Label>
+    </div>
+  )}
```

## 4. Adaptar DoctorProceduresTab

Adicionar prop `isSelfView?: boolean`. Quando true, mostrar botao "Criar Procedimento" (implementado na tarefa 07).

```diff
 interface DoctorProceduresTabProps {
   doctorId: string
+  isSelfView?: boolean
 }
```

## Feito quando

- [ ] Doctor logado ve "Meu Perfil" na sidebar
- [ ] Doctor clica e ve a pagina com 3 tabs
- [ ] Tab Perfil mostra `DoctorProfileCard` sem switch de isActive
- [ ] Tab Agenda mostra `DoctorScheduleTab` funcionando
- [ ] Tab Procedimentos mostra `DoctorProceduresTab` com lista
- [ ] Manager/admin NAO ve "Meu Perfil" na sidebar (a rota redireciona se nao for doctor)
- [ ] Rota `/clinic/profile` redireciona para `/clinic` se nao for doctor
