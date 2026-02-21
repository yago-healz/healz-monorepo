# Task 03 — Frontend Types & Hooks

**Objetivo:** Criar tipos TypeScript e React Query hooks para consumir os endpoints de configurações da clínica.

---

## 📁 Arquivos Afetados

### Modificar
- `apps/web/src/types/onboarding.ts` (tipos existentes estão aqui, podem ficar)

### Criar
- `apps/web/src/lib/api/clinic-settings-endpoints.ts` (constantes de endpoints)
- `apps/web/src/features/clinic/api/clinic-settings.api.ts` (hooks React Query)

---

## Implementação

### 1. Constantes de Endpoints

```typescript
// apps/web/src/lib/api/clinic-settings-endpoints.ts
export const CLINIC_SETTINGS_ENDPOINTS = {
  OBJECTIVES: (clinicId: string) => `/clinics/${clinicId}/settings/objectives`,
  SERVICES: (clinicId: string) => `/clinics/${clinicId}/settings/services`,
  SCHEDULING: (clinicId: string) => `/clinics/${clinicId}/settings/scheduling`,
  CAROL: (clinicId: string) => `/clinics/${clinicId}/settings/carol`,
  NOTIFICATIONS: (clinicId: string) => `/clinics/${clinicId}/settings/notifications`,
}
```

### 2. React Query Hooks

```typescript
// apps/web/src/features/clinic/api/clinic-settings.api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { CLINIC_SETTINGS_ENDPOINTS } from '@/lib/api/clinic-settings-endpoints'
import type {
  Priority,
  PainPoint,
  Service,
  TimeBlock,
} from '@/types/onboarding'

// ============================================
// OBJECTIVES
// ============================================

export interface ClinicObjectivesResponse {
  id: string
  clinicId: string
  priorities: Priority[]
  painPoints: PainPoint[]
  additionalNotes?: string
  createdAt: string
  updatedAt?: string
}

export const useClinicObjectives = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'objectives'],
    queryFn: async (): Promise<ClinicObjectivesResponse> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicObjectives = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      priorities: Priority[]
      painPoints: PainPoint[]
      additionalNotes?: string
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.OBJECTIVES(clinicId),
        data
      )
      return response.data as ClinicObjectivesResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'objectives'],
      })
      toast.success('Objetivos salvos com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar objetivos')
    },
  })
}

// ============================================
// SERVICES
// ============================================

export interface ClinicServicesResponse {
  id: string
  clinicId: string
  services: Service[]
  createdAt: string
  updatedAt?: string
}

export const useClinicServices = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'services'],
    queryFn: async (): Promise<ClinicServicesResponse> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicServices = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { services: Service[] }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SERVICES(clinicId),
        data
      )
      return response.data as ClinicServicesResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'services'],
      })
      toast.success('Serviços salvos com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar serviços')
    },
  })
}

// ============================================
// SCHEDULING
// ============================================

export interface ClinicSchedulingResponse {
  id: string
  clinicId: string
  timeBlocks: TimeBlock[]
  minimumInterval: number
  createdAt: string
  updatedAt?: string
}

export const useClinicScheduling = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'scheduling'],
    queryFn: async (): Promise<ClinicSchedulingResponse> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicScheduling = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      timeBlocks: TimeBlock[]
      minimumInterval: number
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.SCHEDULING(clinicId),
        data
      )
      return response.data as ClinicSchedulingResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'scheduling'],
      })
      toast.success('Configurações de agendamento salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações de agendamento')
    },
  })
}

// ============================================
// CAROL SETTINGS
// ============================================

export interface ClinicCarolSettingsResponse {
  id: string
  clinicId: string
  selectedTraits: string[]
  greeting: string
  restrictSensitiveTopics: boolean
  createdAt: string
  updatedAt?: string
}

export const useClinicCarolSettings = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'carol'],
    queryFn: async (): Promise<ClinicCarolSettingsResponse> => {
      const response = await api.get(CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId))
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicCarolSettings = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      selectedTraits: string[]
      greeting: string
      restrictSensitiveTopics: boolean
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.CAROL(clinicId),
        data
      )
      return response.data as ClinicCarolSettingsResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'carol'],
      })
      toast.success('Configurações do Carol salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações do Carol')
    },
  })
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface NotificationSettings {
  newBooking: boolean
  riskOfLoss: boolean
}

export interface ClinicNotificationsResponse {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannel: 'whatsapp' | 'email'
  phoneNumber?: string
  createdAt: string
  updatedAt?: string
}

export const useClinicNotifications = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic', clinicId, 'settings', 'notifications'],
    queryFn: async (): Promise<ClinicNotificationsResponse> => {
      const response = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId)
      )
      return response.data
    },
    enabled: !!clinicId,
  })
}

export const useSaveClinicNotifications = (clinicId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      notificationSettings: NotificationSettings
      alertChannel: 'whatsapp' | 'email'
      phoneNumber?: string
    }) => {
      const response = await api.patch(
        CLINIC_SETTINGS_ENDPOINTS.NOTIFICATIONS(clinicId),
        data
      )
      return response.data as ClinicNotificationsResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['clinic', clinicId, 'settings', 'notifications'],
      })
      toast.success('Configurações de notificações salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações de notificações')
    },
  })
}
```

### 3. Atualizar Tipos Existentes (Opcional)

Os tipos em `apps/web/src/types/onboarding.ts` já estão bem estruturados. Se necessário, adicionar exports para tipos de resposta:

```typescript
// apps/web/src/types/onboarding.ts - ao final
export type { ClinicObjectivesResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicServicesResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicSchedulingResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicCarolSettingsResponse } from '@/features/clinic/api/clinic-settings.api'
export type { ClinicNotificationsResponse } from '@/features/clinic/api/clinic-settings.api'
```

---

## 🎯 Resumo de Hooks

### Padrão para cada configuração:

```typescript
// GET - Restaurar dados salvos
useClinic<Setting>(clinicId: string): {
  data?: <Setting>Response
  isLoading: boolean
  error?: Error
}

// PATCH - Salvar dados
useSaveClinic<Setting>(clinicId: string): {
  mutate: (data: <Setting>Dto) => Promise<<Setting>Response>
  isPending: boolean
  error?: Error
}
```

**Exemplo de uso em componente:**

```typescript
import { useClinicObjectives, useSaveClinicObjectives } from '@/features/clinic/api/clinic-settings.api'

export function ObjectivesTab() {
  const clinicId = useClinicId() // obter de context/route

  // GET data
  const { data, isLoading } = useClinicObjectives(clinicId)

  // Mutation para PATCH
  const { mutate: saveObjectives, isPending } = useSaveClinicObjectives(clinicId)

  // Preencher estado local com dados recuperados
  useEffect(() => {
    if (data) {
      setPriorities(data.priorities)
      setPainPoints(data.painPoints)
      setAdditionalNotes(data.additionalNotes || '')
    }
  }, [data])

  // Handler para salvar
  const handleSave = async () => {
    await saveObjectives({
      priorities,
      painPoints,
      additionalNotes,
    })
  }
}
```

---

## ✅ Critério de Sucesso

- [ ] Arquivo `clinic-settings-endpoints.ts` com 5 funções endpoint
- [ ] Arquivo `clinic-settings.api.ts` com 10 hooks (2 por aba: GET + PATCH)
- [ ] Todos os hooks tipados corretamente (TypeScript sem errors)
- [ ] Hooks seguem padrão existente (useQuery + useMutation, com invalidate + toast)
- [ ] Response interfaces definidas para cada aba
- [ ] Hooks podem ser importados em componentes: `import { useClinicObjectives, useSaveClinicObjectives } from '@/features/clinic/api/clinic-settings.api'`
