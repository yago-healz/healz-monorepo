# Fase 06 — Frontend: Playground

## Objetivo

Criar a interface de chat onde o admin da clínica pode testar a Carol antes de publicar, alternando entre versão Draft e Published.

## Pré-requisitos

- Fase 03 concluída (endpoint de chat funcionando)
- Fase 04 concluída (rota `/clinic/carol/playground` existe)

## Pode ser feita em paralelo com

- Fase 05 (Frontend Configurações)

---

## Arquivos

### Criar
- `apps/web/src/features/carol/components/carol-playground-page.tsx`
- `apps/web/src/features/carol/components/chat-message.tsx`

### Modificar
- `apps/web/src/routes/_authenticated/clinic/carol/playground.tsx` — trocar placeholder pelo componente real

---

## Layout

```
┌──────────────────────────────────────────────────────────┐
│  Carol Playground          [Testando: Draft ↕ Published] │
│──────────────────────────────────────────────────────────│
│                                                          │
│   🤖 Carol: Olá! Sou a Carol da Clínica X. Como posso   │
│            ajudar você hoje?                             │
│                                                          │
│   👤 Você: Quero marcar uma consulta                     │
│                                                          │
│   🤖 Carol: Claro! Temos disponibilidade na terça...    │
│            [tools: get_operating_hours, check_avail.]    │
│                                                          │
│──────────────────────────────────────────────────────────│
│  [Nova conversa]                    [Publicar Draft]     │
│  [ Digite sua mensagem...                    ] [Enviar]  │
└──────────────────────────────────────────────────────────┘
```

---

## Componente Principal

```typescript
// features/carol/components/carol-playground-page.tsx

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

  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: sendMessage, isPending: isSending } = useSendMessage()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()

  const hasPublished = !!publishedConfig
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll ao receber mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || isSending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')

    sendMessage(
      { message: userMessage.content, version, sessionId: sessionId ?? undefined },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            toolsUsed: data.toolsUsed,
            timestamp: new Date(),
          }])
        },
        onError: () => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro. Tente novamente.',
            timestamp: new Date(),
          }])
        },
      },
    )
  }

  function handleNewConversation() {
    setMessages([])
    setSessionId(null)
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
        {/* Toggle Draft/Published */}
        <Select value={version} onValueChange={(v) => {
          setVersion(v as 'draft' | 'published')
          handleNewConversation() // reset ao trocar versão
        }}>
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
        {messages.map(msg => (
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
```

---

## Componente de Mensagem

```typescript
// features/carol/components/chat-message.tsx

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
      <div className={cn(
        'max-w-[75%] rounded-lg px-4 py-2',
        isAssistant
          ? 'bg-muted text-foreground'
          : 'bg-primary text-primary-foreground',
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {message.toolsUsed.map(tool => (
              <span
                key={tool}
                className="text-xs bg-background/50 rounded px-1.5 py-0.5 text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs opacity-60 mt-1 block">
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
      {!isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  )
}
```

---

## API Hook (já definido na Fase 05)

O hook `useSendMessage` é definido em `features/carol/api/carol.api.ts` (Fase 05).

---

## Comportamento

| Ação | Resultado |
|------|-----------|
| Enviar mensagem | Adiciona mensagem do user, chama API, adiciona resposta da Carol |
| Enter (sem Shift) | Envia mensagem |
| Shift+Enter | Quebra de linha |
| "Nova conversa" | Limpa mensagens e sessionId |
| Trocar versão | Reseta conversa (nova sessão) |
| "Publicar Draft" | Chama `POST /publish`, mostra toast de sucesso |
| Published desabilitado | Se não há versão publicada, `SelectItem` fica disabled |

---

## Checklist

- [ ] Implementar `CarolPlaygroundPage` com layout de chat
- [ ] Implementar `ChatMessage` com bolhas de mensagem
- [ ] Toggle Draft/Published funcional
- [ ] Enviar mensagem e exibir resposta
- [ ] Auto-scroll em novas mensagens
- [ ] Loading state ("Carol está pensando...")
- [ ] Botão "Nova conversa" limpa sessão
- [ ] Botão "Publicar Draft" funcional (apenas no modo Draft)
- [ ] Exibir tools usadas (badges de debug)
- [ ] Trocar placeholder na rota pelo componente real
