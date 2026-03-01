import { createFileRoute } from '@tanstack/react-router'
import { CarolSettingsPage } from '@/features/carol/components/carol-settings-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/settings')({
  component: CarolSettingsPage,
})
