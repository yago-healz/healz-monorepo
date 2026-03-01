export const ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    SWITCH_CONTEXT: '/auth/switch-context',
  },

  // Signup
  SIGNUP: '/signup',

  // Invites
  INVITES: {
    SEND: '/invites',
    ACCEPT: '/invites/accept',
  },

  // Organizations
  ORGANIZATIONS: {
    CLINICS: (orgId: string) => `/organizations/${orgId}/clinics`,
  },

  // Clinics
  CLINICS: {
    MEMBERS: (clinicId: string) => `/clinics/${clinicId}/members`,
  },

  // Carol
  CAROL: {
    CONFIG: (clinicId: string) => `/clinics/${clinicId}/carol/config`,
    CONFIG_PUBLISHED: (clinicId: string) => `/clinics/${clinicId}/carol/config/published`,
    PUBLISH: (clinicId: string) => `/clinics/${clinicId}/carol/config/publish`,
    CHAT: (clinicId: string) => `/clinics/${clinicId}/carol/chat`,
  },

  // Platform Admin
  PLATFORM_ADMIN: {
    ORGANIZATIONS: {
      LIST: '/platform-admin/organizations',
      CREATE: '/platform-admin/organizations',
      GET: (id: string) => `/platform-admin/organizations/${id}`,
      UPDATE: (id: string) => `/platform-admin/organizations/${id}`,
      UPDATE_STATUS: (id: string) => `/platform-admin/organizations/${id}/status`,
    },
    CLINICS: {
      LIST: '/platform-admin/clinics',
      CREATE: '/platform-admin/clinics',
      GET: (id: string) => `/platform-admin/clinics/${id}`,
      UPDATE: (id: string) => `/platform-admin/clinics/${id}`,
      TRANSFER: (id: string) => `/platform-admin/clinics/${id}/transfer`,
      UPDATE_STATUS: (id: string) => `/platform-admin/clinics/${id}/status`,
    },
    USERS: {
      LIST: '/platform-admin/users',
      CREATE: '/platform-admin/users',
      GET: (id: string) => `/platform-admin/users/${id}`,
      UPDATE: (id: string) => `/platform-admin/users/${id}`,
      RESET_PASSWORD: (id: string) => `/platform-admin/users/${id}/reset-password`,
      VERIFY_EMAIL: (id: string) => `/platform-admin/users/${id}/verify-email`,
      RESEND_INVITE: (id: string) => `/platform-admin/users/${id}/resend-invite`,
      UPDATE_STATUS: (id: string) => `/platform-admin/users/${id}/status`,
      ADD_TO_CLINIC: (userId: string) => `/platform-admin/users/${userId}/clinics`,
      UPDATE_CLINIC_ROLE: (userId: string, clinicId: string) =>
        `/platform-admin/users/${userId}/clinics/${clinicId}`,
      REMOVE_FROM_CLINIC: (userId: string, clinicId: string) =>
        `/platform-admin/users/${userId}/clinics/${clinicId}`,
      IMPERSONATE: (id: string) => `/platform-admin/users/${id}/impersonate`,
      REVOKE_SESSIONS: (id: string) => `/platform-admin/users/${id}/revoke-sessions`,
    },
    ADMINS: {
      LIST: '/platform-admin/admins',
      CREATE: '/platform-admin/admins',
      REVOKE: (id: string) => `/platform-admin/admins/${id}`,
    },
  },
} as const
