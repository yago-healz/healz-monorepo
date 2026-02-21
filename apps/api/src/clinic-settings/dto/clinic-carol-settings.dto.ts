import { IsArray, IsString, IsBoolean } from 'class-validator'

export class ClinicCarolSettingsDto {
  @IsArray()
  selectedTraits: string[] // ["welcoming", "empathetic", ...]

  @IsString()
  greeting: string

  @IsBoolean()
  restrictSensitiveTopics: boolean
}

export class GetClinicCarolSettingsResponseDto {
  id: string
  clinicId: string
  selectedTraits: string[]
  greeting: string
  restrictSensitiveTopics: boolean
  createdAt: Date
  updatedAt?: Date
}
