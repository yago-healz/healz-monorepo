export const CLINIC_SETTINGS_ENDPOINTS = {
  GENERAL: (clinicId: string) => `/clinics/${clinicId}/settings/general`,
  OBJECTIVES: (clinicId: string) => `/clinics/${clinicId}/settings/objectives`,
  SERVICES: (clinicId: string) => `/clinics/${clinicId}/settings/services`,
  SCHEDULING: (clinicId: string) => `/clinics/${clinicId}/settings/scheduling`,
  NOTIFICATIONS: (clinicId: string) =>
    `/clinics/${clinicId}/settings/notifications`,
  CONNECTORS: (clinicId: string) => `/clinics/${clinicId}/settings/connectors`,
};
