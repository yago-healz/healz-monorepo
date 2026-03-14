import { useCurrentUser } from '@/features/auth/api/queries'

export function useUserRole() {
  const { data: user, isLoading } = useCurrentUser()

  const isPlatformAdmin = !user?.activeClinic
  const isClinicStaff = !!user?.activeClinic
  const activeClinic = user?.activeClinic ?? null
  const role = activeClinic?.role ?? null

  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isDoctor = role === 'doctor'
  const isReceptionist = role === 'receptionist'
  const isViewer = role === 'viewer'

  // Admin and Manager can manage the clinic (members, doctors, carol, settings)
  const canManageClinic = isAdmin || isManager

  return {
    user,
    isPlatformAdmin,
    isClinicStaff,
    activeClinic,
    role,
    isAdmin,
    isManager,
    isDoctor,
    isReceptionist,
    isViewer,
    canManageClinic,
    isLoading,
  }
}
