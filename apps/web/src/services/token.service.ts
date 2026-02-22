import { jwtDecode } from 'jwt-decode'
import type { User, ActiveClinic, AvailableClinic } from '@/types/api.types'

const ACCESS_TOKEN_KEY = 'healz_access_token'
const USER_KEY = 'healz_user'
const ORIGINAL_TOKEN_KEY = 'healz_original_token'
const ORIGINAL_USER_KEY = 'healz_original_user'

interface JwtPayload {
  userId: string
  email: string
  organizationId?: string
  activeClinicId?: string
  clinicAccess?: Array<{
    clinicId: string
    clinicName: string
    role: string
  }>
}

export const tokenService = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  getUser(): any | null {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  setUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  // Update user from JWT token
  updateUserFromToken(token: string): void {
    try {
      const payload = jwtDecode<JwtPayload>(token)
      const currentUser = this.getUser()

      // Build activeClinic from payload
      let activeClinic: ActiveClinic | null = null
      if (payload.activeClinicId && payload.organizationId) {
        const clinicInfo = payload.clinicAccess?.find(
          (c) => c.clinicId === payload.activeClinicId
        )
        if (clinicInfo) {
          activeClinic = {
            id: payload.activeClinicId,
            name: clinicInfo.clinicName,
            organizationId: payload.organizationId,
            role: clinicInfo.role as 'admin' | 'doctor' | 'receptionist',
          }
        }
      }

      // Build availableClinics from payload
      const availableClinics: AvailableClinic[] =
        payload.clinicAccess?.map((c) => ({
          clinicId: c.clinicId,
          clinicName: c.clinicName,
          role: c.role as 'admin' | 'doctor' | 'receptionist',
        })) ?? []

      // Update user object
      const updatedUser: User = {
        id: payload.userId,
        email: payload.email,
        name: currentUser?.name ?? payload.email.split('@')[0], // Fallback to email username
        emailVerified: currentUser?.emailVerified ?? true,
        activeClinic,
        availableClinics,
      }

      this.setUser(updatedUser)
    } catch (error) {
      console.error('Failed to decode JWT token:', error)
    }
  },

  saveOriginalSession(): void {
    const token = this.getAccessToken()
    const user = this.getUser()
    if (token) localStorage.setItem(ORIGINAL_TOKEN_KEY, token)
    if (user) localStorage.setItem(ORIGINAL_USER_KEY, JSON.stringify(user))
  },

  restoreOriginalSession(): void {
    const token = localStorage.getItem(ORIGINAL_TOKEN_KEY)
    const user = localStorage.getItem(ORIGINAL_USER_KEY)
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
    if (user) localStorage.setItem(USER_KEY, user)
    localStorage.removeItem(ORIGINAL_TOKEN_KEY)
    localStorage.removeItem(ORIGINAL_USER_KEY)
  },

  isImpersonating(): boolean {
    return !!localStorage.getItem(ORIGINAL_TOKEN_KEY)
  },

  getOriginalUser(): any | null {
    const user = localStorage.getItem(ORIGINAL_USER_KEY)
    return user ? JSON.parse(user) : null
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ORIGINAL_TOKEN_KEY)
    localStorage.removeItem(ORIGINAL_USER_KEY)
  },

  hasValidToken(): boolean {
    return !!this.getAccessToken()
  },

  getActiveClinicId(): string | null {
    const user = this.getUser()
    return user?.activeClinic?.id ?? null
  },
}
