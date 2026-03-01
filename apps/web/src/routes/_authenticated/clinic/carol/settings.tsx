import { createFileRoute } from '@tanstack/react-router'
import { CarolPage } from '@/features/carol/components/carol-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/settings')({
  component: CarolPage,
})
