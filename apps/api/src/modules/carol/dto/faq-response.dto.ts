export class FaqResponseDto {
  id: string
  clinicId: string
  question: string
  answer: string
  createdAt: Date
  updatedAt: Date | null
}
