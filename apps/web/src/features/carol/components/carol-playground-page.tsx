import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCarolPublishedConfig, usePublishCarolConfig, useSendMessage } from '../api/carol.api'
import { ChatMessage } from './chat-message'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  timestamp: Date
}

export function CarolPlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [version, setVersion] = useState<'draft' | 'published'>('draft')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  const hasPublished = !!publishedConfig

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Carol Playground</h1>
          <p className="text-sm text-muted-foreground">
            Simule uma conversa como paciente para testar a Carol
          </p>
        </div>
        <Select
          value={version}
          onValueChange={(v) => {
            setVersion(v as 'draft' | 'published')
            handleNewConversation()
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Testando: Draft</SelectItem>
            <SelectItem value="published" disabled={!hasPublished}>
              Testando: Published
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Envie uma mensagem para iniciar a conversa com a Carol</p>
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
      <div className="border-t pt-4 space-y-3">
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
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleNewConversation}>
            Nova conversa
          </Button>
          {version === 'draft' && (
            <Button
              size="sm"
              onClick={() => publishConfig()}
              disabled={isPublishing}
              className="bg-gradient-to-r from-pink-500 to-pink-400 text-white"
            >
              {isPublishing ? 'Publicando...' : 'Publicar Draft'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
