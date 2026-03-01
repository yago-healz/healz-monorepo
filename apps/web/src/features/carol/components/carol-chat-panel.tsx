import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, RotateCcw, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCarolPublishedConfig, useSendMessage } from '../api/carol.api'
import { ChatMessage } from './chat-message'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  timestamp: Date
}

interface CarolChatPanelProps {
  resetKey: number
}

export function CarolChatPanel({ resetKey }: CarolChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [version, setVersion] = useState<'draft' | 'published'>('draft')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()

  const hasPublished = !!publishedConfig

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
    setSessionId(null)
  }, [resetKey])

  function handleNewConversation() {
    setMessages([])
    setSessionId(null)
  }

  function handleSend() {
    if (!input.trim() || isSending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    sendMessage(
      { message: userMessage.content, version, sessionId: sessionId ?? undefined },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId)
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: data.reply,
              toolsUsed: data.toolsUsed,
              timestamp: new Date(),
            },
          ])
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Desculpe, ocorreu um erro. Tente novamente.',
              timestamp: new Date(),
            },
          ])
        },
      },
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 flex-none">
        <span className="font-semibold text-sm">Playground</span>
        <div className="flex items-center gap-2">
          <Select
            value={version}
            onValueChange={(v) => {
              setVersion(v as 'draft' | 'published')
              handleNewConversation()
            }}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published" disabled={!hasPublished}>
                Published
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewConversation} title="Nova conversa">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Envie uma mensagem para iniciar a conversa com a Carol</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isSending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carol está pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex-none">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-10 max-h-32 resize-none"
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
