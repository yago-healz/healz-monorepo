const ACCESS_TOKEN_KEY = 'healz_access_token'
const USER_KEY = 'healz_user'

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

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  hasValidToken(): boolean {
    return !!this.getAccessToken()
  },
}
