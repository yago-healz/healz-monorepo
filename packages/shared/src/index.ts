// Tipos e utilitários compartilhados entre apps

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type TenantId = string;
export type UserId = string;
