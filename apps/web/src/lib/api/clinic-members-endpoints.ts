export const CLINIC_MEMBERS_ENDPOINTS = {
  LIST: (clinicId: string) => `/clinics/${clinicId}/members`,
  ADD_EXISTING: (clinicId: string) => `/clinics/${clinicId}/members`,
  REMOVE: (clinicId: string, userId: string) =>
    `/clinics/${clinicId}/members/${userId}`,
  UPDATE_ROLE: (clinicId: string, userId: string) =>
    `/clinics/${clinicId}/members/${userId}`,
  RESEND_INVITE: (clinicId: string) =>
    `/clinics/${clinicId}/members/resend-invite`,
  INVITE_NEW: () => `/invites`,
};
