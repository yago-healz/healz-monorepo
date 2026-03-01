import { createFileRoute } from '@tanstack/react-router'
import { CarolPlaygroundPage } from '@/features/carol/components/carol-playground-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/playground')({
  component: CarolPlaygroundPage,
})
