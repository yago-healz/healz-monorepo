export interface SchedulingRules {
  confirmBeforeScheduling: boolean
  allowCancellation: boolean
  allowRescheduling: boolean
  postSchedulingMessage: string
}

export interface CarolConfig {
  id: string
  clinicId: string
  name: string
  selectedTraits: string[]
  voiceTone: 'formal' | 'informal' | 'empathetic'
  greeting: string
  restrictSensitiveTopics: boolean
  schedulingRules: SchedulingRules
  status: 'draft' | 'published'
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface SaveCarolConfigRequest {
  name?: string
  selectedTraits?: string[]
  voiceTone?: string
  greeting?: string
  restrictSensitiveTopics?: boolean
  schedulingRules?: Partial<SchedulingRules>
}

export interface ChatRequest {
  message: string
  version: 'draft' | 'published'
  sessionId?: string
}

export interface ChatResponse {
  reply: string
  sessionId: string
  toolsUsed?: string[]
}
