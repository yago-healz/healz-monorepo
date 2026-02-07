import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { tokenService } from '@/services/token.service'
import type { LoginDto, LoginResponse, SwitchContextDto, ForgotPasswordDto, ResetPasswordDto } from '@/types/api.types'

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginDto): Promise<LoginResponse> => {
      const response = await api.post(ENDPOINTS.AUTH.LOGIN, data)
      return response.data
    },
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken)
      tokenService.setUser(data.user)
      queryClient.setQueryData(['auth', 'user'], data.user)
      toast.success('Login realizado com sucesso!')
    },
    onError: () => {
      toast.error('Credenciais inválidas')
    },
  })
}

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post(ENDPOINTS.AUTH.LOGOUT)
    },
    onSuccess: () => {
      tokenService.clearTokens()
      queryClient.clear()
      window.location.href = '/login'
    },
  })
}

// Switch context mutation
export const useSwitchContextMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SwitchContextDto) => {
      const response = await api.post(ENDPOINTS.AUTH.SWITCH_CONTEXT, data)
      return response.data
    },
    onSuccess: (data) => {
      tokenService.setAccessToken(data.accessToken)
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
      toast.success('Contexto alterado com sucesso!')
    },
  })
}

// Forgot password mutation
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: ForgotPasswordDto) => {
      const response = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Email de recuperação enviado!')
    },
  })
}

// Reset password mutation
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: ResetPasswordDto) => {
      const response = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
    },
  })
}

// Verify email mutation
export const useVerifyEmailMutation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, { token })
      return response.data
    },
    onSuccess: () => {
      toast.success('Email verificado com sucesso!')
    },
  })
}

// Resend verification mutation
export const useResendVerificationMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(ENDPOINTS.AUTH.RESEND_VERIFICATION)
      return response.data
    },
    onSuccess: () => {
      toast.success('Email de verificação reenviado!')
    },
  })
}
