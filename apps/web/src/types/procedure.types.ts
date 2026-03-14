export interface Procedure {
  id: string
  clinicId: string
  name: string
  description: string | null
  category: string | null
  defaultDuration: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateProcedureDto {
  name: string
  description?: string
  category?: string
  defaultDuration: number
}

export interface UpdateProcedureDto {
  name?: string
  description?: string
  category?: string
  defaultDuration?: number
  isActive?: boolean
}

export interface ListProceduresParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: 'active' | 'inactive' | 'all'
}
