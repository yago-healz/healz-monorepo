import { useCurrentUser } from '../api/queries'
import { useLoginMutation, useLogoutMutation, useSwitchContextMutation } from '../api/mutations'
import { tokenService } from '@/services/token.service'

export function useAuth() {
  const { data: user, isLoading } = useCurrentUser()
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const switchContextMutation = useSwitchContextMutation()

  return {
    // User data
    user,
    isLoading,
    isAuthenticated: !!user && tokenService.hasValidToken(),

    // Actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    switchContext: switchContextMutation.mutateAsync,

    // States
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isSwitchingContext: switchContextMutation.isPending,
  }
}
