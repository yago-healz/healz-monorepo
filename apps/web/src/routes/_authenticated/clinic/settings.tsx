import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { ClinicSettingsPage } from '@/features/clinic/components/settings/clinic-settings-page'
import { tokenService } from '@/services/token.service'

const TAB_IDS = ['geral', 'objetivos', 'servicos', 'agendamentos', 'notificacoes', 'conectores', 'pagamentos'] as const

const settingsSearchSchema = z.object({
  tab: z.enum(TAB_IDS).optional().catch('geral'),
  gcal: z.enum(['pending-calendar-selection', 'error']).optional(),
  reason: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: settingsSearchSchema,
  component: ClinicSettingsPage,
})
