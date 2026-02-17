import { useCurrentUser } from '@/features/auth/api/queries'

export function useUserRole() {
  const { data: user, isLoading } = useCurrentUser()

  const isPlatformAdmin = !user?.activeClinic
  const isClinicStaff = !!user?.activeClinic
  const activeClinic = user?.activeClinic ?? null
  const role = activeClinic?.role ?? null

  return {
    user,
    isPlatformAdmin,
    isClinicStaff,
    activeClinic,
    role,
    isLoading,
  }
}
