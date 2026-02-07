// === Common Types ===
export type Status = 'active' | 'inactive'
export type Role = 'admin' | 'doctor' | 'secretary'
export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: SortOrder
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// === User Types ===
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  activeClinic: ActiveClinic
  availableClinics: AvailableClinic[]
}

export interface ActiveClinic {
  id: string
  name: string
  organizationId: string
  role: Role
}

export interface AvailableClinic {
  clinicId: string
  clinicName: string
  role: Role
}

// === Auth Types ===
export interface LoginDto {
  email: string
  password: string
  clinicId?: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface SwitchContextDto {
  clinicId: string
}

export interface SwitchContextResponse {
  accessToken: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  token: string
  password: string
}

export interface VerifyEmailDto {
  token: string
}

// === Organization Types ===
export interface Organization {
  id: string
  name: string
  slug: string
  status: Status
  createdAt: string
  clinicsCount?: number
  usersCount?: number
}

export interface CreateOrganizationDto {
  name: string
  slug: string
  initialClinic: {
    name: string
  }
  initialAdmin: {
    name: string
    email: string
    sendInvite: boolean
    password?: string
  }
}

export interface UpdateOrganizationDto {
  name?: string
  slug?: string
}

export interface UpdateOrgStatusDto {
  status: Status
  reason?: string
}

export interface OrganizationListParams extends PaginationParams {
  search?: string
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name' | 'clinicsCount' | 'usersCount'
}

// === Clinic Types ===
export interface Clinic {
  id: string
  name: string
  organizationId: string
  organizationName?: string
  status: Status
  createdAt: string
}

export interface CreateClinicDto {
  organizationId: string
  name: string
  initialAdminId?: string
}

export interface UpdateClinicDto {
  name?: string
}

export interface TransferClinicDto {
  targetOrganizationId: string
  keepUsers: boolean
}

export interface UpdateClinicStatusDto {
  status: Status
  reason?: string
}

export interface ClinicListParams extends PaginationParams {
  search?: string
  organizationId?: string
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name'
}

// === User Management Types ===
export interface PlatformUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  status: Status
  createdAt: string
  clinics: UserClinic[]
}

export interface UserClinic {
  clinicId: string
  clinicName: string
  organizationId: string
  organizationName: string
  role: Role
}

export interface CreateUserDto {
  name: string
  email: string
  clinicId: string
  role: Role
  sendInvite: boolean
  password?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
}

export interface UpdateUserStatusDto {
  status: Status
  reason?: string
  revokeTokens: boolean
}

export interface AddUserClinicDto {
  clinicId: string
  role: Role
}

export interface UpdateUserClinicDto {
  role: Role
}

export interface UserListParams extends PaginationParams {
  search?: string
  organizationId?: string
  clinicId?: string
  role?: Role
  emailVerified?: 'true' | 'false' | 'all'
  status?: Status | 'all'
  sortBy?: 'createdAt' | 'name' | 'email'
}

// === Invite Types ===
export interface SendInviteDto {
  email: string
  name: string
  clinicId: string
  role: Role
}

export interface AcceptInviteDto {
  token: string
  password: string
}

// === Platform Admin Types ===
export interface PlatformAdmin {
  id: string
  userId: string
  userName: string
  userEmail: string
  createdAt: string
}

export interface CreatePlatformAdminDto {
  userId: string
}
