import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { tokenService } from '@/services/token.service'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies httpOnly (refresh token)
})

// Request interceptor - Adiciona access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenService.getAccessToken()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Se erro 401 e não é rota de refresh/login
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Tenta renovar o token
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        tokenService.setAccessToken(data.accessToken)

        // Retry request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        }
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh falhou, redireciona para login
        tokenService.clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Tratamento de erros global
    if (error.response) {
      const message = (error.response.data as any)?.message || 'Erro ao processar requisição'
      toast.error(message)
    } else if (error.request) {
      toast.error('Erro de conexão com o servidor')
    }

    return Promise.reject(error)
  }
)

export default api
