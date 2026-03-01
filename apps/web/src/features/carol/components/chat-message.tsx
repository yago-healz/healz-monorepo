import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Bot, User } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn('flex gap-3', isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-pink-600" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2',
          isAssistant ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {message.toolsUsed.map((tool) => (
              <span
                key={tool}
                className="text-xs bg-background/50 rounded px-1.5 py-0.5 text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs opacity-60 mt-1 block">{format(message.timestamp, 'HH:mm')}</span>
      </div>
      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  )
}
