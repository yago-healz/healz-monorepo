export const CLINIC_SETTINGS_ENDPOINTS = {
  OBJECTIVES: (clinicId: string) => `/clinics/${clinicId}/settings/objectives`,
  SERVICES: (clinicId: string) => `/clinics/${clinicId}/settings/services`,
  SCHEDULING: (clinicId: string) => `/clinics/${clinicId}/settings/scheduling`,
  CAROL: (clinicId: string) => `/clinics/${clinicId}/settings/carol`,
  NOTIFICATIONS: (clinicId: string) => `/clinics/${clinicId}/settings/notifications`,
}
