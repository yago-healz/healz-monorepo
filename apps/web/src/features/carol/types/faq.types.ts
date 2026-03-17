export interface FaqItem {
  id: string
  clinicId: string
  question: string
  answer: string
  createdAt: string
  updatedAt: string | null
}

export interface CreateFaqRequest {
  question: string
  answer: string
}

export type UpdateFaqRequest = Partial<CreateFaqRequest>
