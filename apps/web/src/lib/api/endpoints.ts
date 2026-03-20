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
    ESCALATION_TRIGGERS: (clinicId: string) => `/clinics/${clinicId}/carol/escalation-triggers`,
    ESCALATION_TRIGGER: (clinicId: string, triggerId: string) =>
      `/clinics/${clinicId}/carol/escalation-triggers/${triggerId}`,
    FAQS: (clinicId: string) => `/clinics/${clinicId}/carol/faqs`,
    FAQ: (clinicId: string, faqId: string) => `/clinics/${clinicId}/carol/faqs/${faqId}`,
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

  // Doctors
  DOCTORS: {
    LIST: (clinicId: string) => `/clinics/${clinicId}/doctors`,
    CREATE: (clinicId: string) => `/clinics/${clinicId}/doctors`,
    GET: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
    UPDATE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
    DEACTIVATE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}`,
    UPDATE_LINK: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/link`,
    GET_SCHEDULE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/schedule`,
    SAVE_SCHEDULE: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/schedule`,
    ME: (clinicId: string) => `/clinics/${clinicId}/doctors/me`,
    CREATE_AND_LINK_PROCEDURE: (clinicId: string, doctorId: string) =>
      `/clinics/${clinicId}/doctors/${doctorId}/procedures/create`,
    CLINICS: (doctorId: string) => `/doctors/${doctorId}/clinics`,
    PROCEDURES: {
      LIST: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures`,
      LINK: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures`,
      UPDATE: (clinicId: string, doctorId: string, procedureId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures/${procedureId}`,
      UNLINK: (clinicId: string, doctorId: string, procedureId: string) => `/clinics/${clinicId}/doctors/${doctorId}/procedures/${procedureId}`,
    },
    CONNECTORS: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/connectors`,
    GOOGLE_CALENDAR_AUTH_URL: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/connectors/google-calendar/auth-url`,
    GOOGLE_CALENDAR_CALENDARS: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/connectors/google-calendar/calendars`,
    GOOGLE_CALENDAR_SELECT: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/connectors/google-calendar/select-calendar`,
    GOOGLE_CALENDAR_DISCONNECT: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/connectors/google-calendar`,
    CALENDAR_EVENTS: (clinicId: string, doctorId: string) => `/clinics/${clinicId}/doctors/${doctorId}/calendar/events`,
  },

  // Procedures
  PROCEDURES: {
    LIST: (clinicId: string) => `/clinics/${clinicId}/procedures`,
    CREATE: (clinicId: string) => `/clinics/${clinicId}/procedures`,
    GET: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
    UPDATE: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
    DEACTIVATE: (clinicId: string, id: string) => `/clinics/${clinicId}/procedures/${id}`,
  },

  // Payment Methods
  PAYMENT_METHODS: {
    LIST: (clinicId: string) => `/clinics/${clinicId}/payment-methods`,
    CREATE: (clinicId: string) => `/clinics/${clinicId}/payment-methods`,
    UPDATE: (clinicId: string, id: string) => `/clinics/${clinicId}/payment-methods/${id}`,
    DEACTIVATE: (clinicId: string, id: string) => `/clinics/${clinicId}/payment-methods/${id}`,
  },
} as const
