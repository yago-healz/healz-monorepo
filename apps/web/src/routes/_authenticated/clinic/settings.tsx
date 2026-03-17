import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { UnifiedSettingsPage } from '@/features/clinic/components/settings/unified-settings-page'
import { tokenService } from '@/services/token.service'

const CAROL_SUBTABS = ['identidade', 'comportamento', 'contexto'] as const
const CLINICA_SUBTABS = ['geral', 'servicos', 'agenda', 'pagamento', 'conectores', 'notificacoes'] as const

const settingsSearchSchema = z.object({
  mainTab: z.enum(['carol', 'clinica']).optional().catch('carol'),
  subTab: z.string().optional(),
  gcal: z.enum(['pending-calendar-selection', 'error']).optional(),
  reason: z.string().optional(),
})

export type SettingsSearch = z.infer<typeof settingsSearchSchema>
export type CarolSubTab = typeof CAROL_SUBTABS[number]
export type ClinicaSubTab = typeof CLINICA_SUBTABS[number]
export { CAROL_SUBTABS, CLINICA_SUBTABS }

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: settingsSearchSchema,
  component: UnifiedSettingsPage,
})
