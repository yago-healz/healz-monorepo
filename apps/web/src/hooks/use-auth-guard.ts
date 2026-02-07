import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { tokenService } from '@/services/token.service'

export function useAuthGuard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!tokenService.hasValidToken()) {
      navigate({ to: '/login' })
    }
  }, [navigate])
}
