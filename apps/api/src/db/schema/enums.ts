import { pgEnum } from 'drizzle-orm/pg-core';

// ============ ENUMS ============
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const clinicStatusEnum = pgEnum('clinic_status', ['active', 'inactive']);
export const roleNameEnum = pgEnum('role_name', ['admin', 'manager', 'doctor', 'receptionist']);
