import { IsObject, IsString, IsOptional } from 'class-validator'

export interface NotificationSettings {
  newBooking: boolean
  riskOfLoss: boolean
}

export class ClinicNotificationsDto {
  @IsObject()
  notificationSettings: NotificationSettings

  @IsString()
  alertChannel: 'whatsapp' | 'email'

  @IsOptional()
  @IsString()
  phoneNumber?: string
}

export class GetClinicNotificationsResponseDto {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannel: string
  phoneNumber?: string
  createdAt: Date
  updatedAt?: Date
}
