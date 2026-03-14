import { createFileRoute, redirect } from '@tanstack/react-router'
import { CarolPage } from '@/features/carol/components/carol-page'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_authenticated/clinic/carol/settings')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  component: CarolPage,
})
