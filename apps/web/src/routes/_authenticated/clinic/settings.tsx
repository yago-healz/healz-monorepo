import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ClinicSettingsPage } from '@/features/clinic/components/settings/clinic-settings-page'

const TAB_IDS = ['geral', 'objetivos', 'servicos', 'agendamentos', 'notificacoes', 'conectores', 'pagamentos'] as const

const settingsSearchSchema = z.object({
  tab: z.enum(TAB_IDS).optional().catch('geral'),
  gcal: z.enum(['pending-calendar-selection', 'error']).optional(),
  reason: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  validateSearch: settingsSearchSchema,
  component: ClinicSettingsPage,
})
