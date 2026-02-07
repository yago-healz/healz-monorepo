import { useQuery } from '@tanstack/react-query'
import { tokenService } from '@/services/token.service'
import type { User } from '@/types/api.types'

// Get current user from token
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => {
      const user = tokenService.getUser()
      if (!user) throw new Error('No user found')
      return user as User
    },
    enabled: tokenService.hasValidToken(),
    staleTime: Infinity, // User data doesn't change unless we update it
  })
}

// Check if user is authenticated
export const useIsAuthenticated = () => {
  const { data: user } = useCurrentUser()
  return !!user && tokenService.hasValidToken()
}
