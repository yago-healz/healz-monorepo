import { createFileRoute } from '@tanstack/react-router'
import { ClinicSettingsPage } from '@/features/clinic/components/settings/clinic-settings-page'

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  component: ClinicSettingsPage,
})
