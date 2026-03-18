export const CLINIC_SETTINGS_ENDPOINTS = {
  GENERAL: (clinicId: string) => `/clinics/${clinicId}/settings/general`,
  OBJECTIVES: (clinicId: string) => `/clinics/${clinicId}/settings/objectives`,
  SCHEDULING: (clinicId: string) => `/clinics/${clinicId}/settings/scheduling`,
  NOTIFICATIONS: (clinicId: string) =>
    `/clinics/${clinicId}/settings/notifications`,
  CAROL: (clinicId: string) => `/clinics/${clinicId}/settings/carol`,
  CONNECTORS: (clinicId: string) => `/clinics/${clinicId}/settings/connectors`,
  GOOGLE_CALENDAR_AUTH_URL: (clinicId: string) => `/clinics/${clinicId}/connectors/google-calendar/auth-url`,
  GOOGLE_CALENDAR_CALENDARS: (clinicId: string) => `/clinics/${clinicId}/connectors/google-calendar/calendars`,
  GOOGLE_CALENDAR_SELECT: (clinicId: string) => `/clinics/${clinicId}/connectors/google-calendar/select-calendar`,
  GOOGLE_CALENDAR_DISCONNECT: (clinicId: string) => `/clinics/${clinicId}/connectors/google-calendar`,
};
