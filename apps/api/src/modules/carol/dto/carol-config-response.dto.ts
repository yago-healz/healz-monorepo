export class CarolConfigResponseDto {
  id: string
  clinicId: string
  name: string
  selectedTraits: string[]
  voiceTone: string
  greeting: string
  restrictSensitiveTopics: boolean
  schedulingRules: Record<string, unknown>
  status: 'draft' | 'published'
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}
