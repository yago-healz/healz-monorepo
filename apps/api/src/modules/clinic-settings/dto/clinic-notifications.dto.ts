import { IsObject, IsArray, IsIn, IsOptional, IsString } from 'class-validator'

export interface NotificationSettings {
  newBooking: boolean
  riskOfLoss: boolean
}

export class ClinicNotificationsDto {
  @IsObject()
  notificationSettings: NotificationSettings

  @IsArray()
  @IsIn(['whatsapp', 'email'], { each: true })
  alertChannels: ('whatsapp' | 'email')[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phoneNumbers?: string[]
}

export class GetClinicNotificationsResponseDto {
  id: string
  clinicId: string
  notificationSettings: NotificationSettings
  alertChannels: ('whatsapp' | 'email')[]
  phoneNumbers?: string[]
  createdAt: Date
  updatedAt?: Date
}
