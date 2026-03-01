# Plano 035 — Carol: Split-Panel UI (Settings + Playground unificados)

**Objetivo:** Substituir as duas páginas separadas (Configurações e Playground) por um único layout de dois painéis lado a lado, permitindo editar e testar a Carol sem troca de rota.

---

## Contexto

A Carol atualmente tem duas rotas e dois itens no sidebar:
- `/clinic/carol/settings` → `CarolSettingsPage`
- `/clinic/carol/playground` → `CarolPlaygroundPage`

O fluxo atual exige que o usuário salve na aba de configurações, troque de página, teste, volte. O objetivo é colapsar tudo em uma única rota com um layout split: formulário de configurações à esquerda (60%) e painel de chat à direita (40%).

**Decisões de design confirmadas:**
- Proporção: 60% config / 40% chat
- Painel de chat colapsável via botão toggle no cabeçalho
- Estado inicial: painel aberto por padrão
- Estado do painel persistido em `localStorage` (`carol_chat_panel_open`)
- Ao salvar o rascunho: chat é limpo automaticamente
- Ao trocar Draft ↔ Published: chat é limpo automaticamente
- Item "Playground" removido do sidebar

---

## Arquivos afetados

| Arquivo | Operação |
|---|---|
| `apps/web/src/features/carol/components/carol-settings-page.tsx` | Refatorar → `carol-settings-form.tsx` |
| `apps/web/src/features/carol/components/carol-playground-page.tsx` | Refatorar → `carol-chat-panel.tsx` |
| `apps/web/src/features/carol/components/carol-page.tsx` | **Criar** (componente pai, layout split) |
| `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx` | Atualizar para usar `CarolPage` |
| `apps/web/src/routes/_authenticated/clinic/carol/playground.tsx` | Adicionar redirect para `/clinic/carol/settings` |
| `apps/web/src/components/layout/clinic-sidebar.tsx` | Remover item "Playground" do nav |

---

## Implementação

### 1. Criar `carol-settings-form.tsx`

Extrair o formulário de `carol-settings-page.tsx` removendo o cabeçalho e o card de status (que serão gerenciados pelo pai).

**Props:**
```ts
interface CarolSettingsFormProps {
  onSaved: () => void  // chamado após salvar com sucesso, para o pai limpar o chat
}
```

**O que remover** do componente atual:
- `<div>` com título "Configurações da Carol" e subtítulo
- `<Card>` de Status (com badge + botão Publicar) — esse card sobe para o `carol-page.tsx`

**O que manter:**
- Todo o `useForm`, `useEffect`, `onSubmit`
- Os três `<Card>`: Identidade, Saudação Inicial, Regras
- Botão "Salvar Rascunho"

**Chamar `onSaved` no `onSuccess` do `useSaveCarolConfig`:**
```ts
// Não modificar o hook — chamar o callback no onSuccess local dentro do componente:
const { mutate: saveConfig, isPending: isSaving } = useSaveCarolConfig()

function onSubmit(values: FormValues) {
  saveConfig(values, { onSuccess: () => onSaved() })
}
```

> O arquivo `carol-settings-page.tsx` pode ser deletado após a migração.

---

### 2. Criar `carol-chat-panel.tsx`

Extrair o chat de `carol-playground-page.tsx` adaptando para funcionar como painel embedado.

**Props:**
```ts
interface CarolChatPanelProps {
  resetKey: number  // quando muda, o chat é limpo (messages=[], sessionId=null)
}
```

**Mudanças em relação ao original:**
- Remover o wrapper `<div className="flex flex-col h-[calc(100vh-8rem)]">` — o pai controla a altura
- Adicionar `useEffect([resetKey])` que faz `setMessages([])` e `setSessionId(null)` quando `resetKey` muda
- Remover o botão "Publicar Draft" do footer (o botão de publicar sobe para o cabeçalho do pai)
- O cabeçalho interno do painel deve ser compacto: título "Playground" + seletor Draft/Published + botão Nova Conversa (ícone `RotateCcw`)

**Layout interno do painel** (flex column, altura 100% do container):
```
┌─────────────────────────────────┐
│ Playground  [Draft ▼]  [↺]     │  ← flex-none, border-b, px-4 py-3
│─────────────────────────────────│
│                                 │
│  [mensagens...]                 │  ← flex-1, overflow-y-auto, px-4 py-4
│                                 │
│─────────────────────────────────│
│ [input...]              [Send]  │  ← flex-none, border-t, px-4 py-3
└─────────────────────────────────┘
```

> O arquivo `carol-playground-page.tsx` pode ser deletado após a migração.

---

### 3. Criar `carol-page.tsx`

Componente pai que gerencia o layout split e o estado do painel de chat.

**Estado local:**
```ts
const [chatOpen, setChatOpen] = useState<boolean>(() => {
  return localStorage.getItem('carol_chat_panel_open') !== 'false'
})
const [chatResetKey, setChatResetKey] = useState(0)
```

**Persistir toggle no localStorage:**
```ts
function toggleChat() {
  setChatOpen((prev) => {
    const next = !prev
    localStorage.setItem('carol_chat_panel_open', String(next))
    return next
  })
}
```

**Callback de save → reset do chat:**
```ts
function handleSaved() {
  setChatResetKey((k) => k + 1)
}
```

**Cabeçalho da página:**
```tsx
<div className="flex items-center justify-between pb-4 border-b flex-none">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Carol</h1>
    <div className="flex items-center gap-2 mt-1">
      <Badge variant={isPublished ? 'default' : 'secondary'}>
        {isPublished ? 'Publicada' : 'Rascunho'}
      </Badge>
      {publishedConfig?.publishedAt && (
        <span className="text-sm text-muted-foreground">
          Última publicação: {format(publishedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      )}
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={toggleChat}>
      {chatOpen ? <PanelRightClose className="w-4 h-4 mr-2" /> : <PanelRightOpen className="w-4 h-4 mr-2" />}
      Playground
    </Button>
    <Button disabled={isPublishing} onClick={() => publishConfig()}>
      {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Publicar
    </Button>
  </div>
</div>
```

**Layout split:**
```tsx
<div className="flex flex-1 overflow-hidden gap-6">
  {/* Coluna esquerda — configurações */}
  <div className={cn('overflow-y-auto', chatOpen ? 'flex-[3]' : 'flex-1')}>
    <CarolSettingsForm onSaved={handleSaved} />
  </div>

  {/* Coluna direita — chat */}
  {chatOpen && (
    <div className="flex-[2] border rounded-lg overflow-hidden flex flex-col">
      <CarolChatPanel resetKey={chatResetKey} />
    </div>
  )}
</div>
```

**Estrutura completa do componente:**
```tsx
export function CarolPage() {
  const { data: draftConfig, isLoading } = useCarolDraftConfig()
  const { data: publishedConfig } = useCarolPublishedConfig()
  const { mutate: publishConfig, isPending: isPublishing } = usePublishCarolConfig()
  const [chatOpen, setChatOpen] = useState(...)
  const [chatResetKey, setChatResetKey] = useState(0)

  if (isLoading) return <SettingsLoading />

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* cabeçalho */}
      {/* split content */}
    </div>
  )
}
```

> Importar `SettingsLoading` de `@/features/clinic/components/settings/tabs/settings-loading`

---

### 4. Atualizar rota `/carol/settings`

```ts
// apps/web/src/routes/_authenticated/clinic/carol/settings.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CarolPage } from '@/features/carol/components/carol-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/settings')({
  component: CarolPage,
})
```

---

### 5. Redirecionar rota `/carol/playground`

```ts
// apps/web/src/routes/_authenticated/clinic/carol/playground.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/clinic/carol/playground')({
  beforeLoad: () => {
    throw redirect({ to: '/clinic/carol/settings' })
  },
})
```

---

### 6. Atualizar sidebar — remover item "Playground"

Em `apps/web/src/components/layout/clinic-sidebar.tsx`, remover o item do array `navigation`:

```ts
// Remover este item da seção 'Carol':
{
  title: 'Playground',
  icon: MessageSquare,
  href: '/clinic/carol/playground',
}
```

Após a remoção, a seção Carol fica com apenas um item. Se preferir, pode renomear o item restante de "Configurações" para "Carol":
```ts
{
  title: 'Carol',
  icon: Bot,
  href: '/clinic/carol/settings',
}
```
E remover o `SidebarGroupLabel` "Carol" se a seção virar item único. — **Decisão deixada ao implementador.**

---

## Ordem de execução

```
1. [Tarefa 1] carol-settings-form.tsx
   [Tarefa 2] carol-chat-panel.tsx
   ↑ paralelas — sem dependência entre si

2. [Tarefa 3] carol-page.tsx
   ↑ depende de 1 e 2

3. [Tarefa 4] rota settings.tsx
   [Tarefa 5] rota playground.tsx
   [Tarefa 6] sidebar.tsx
   ↑ paralelas — dependem de 3
```

---

## Fora do escopo

- Responsividade mobile (layout em tela única com tabs)
- Painel de chat redimensionável por drag
- Animações de abertura/fechamento do painel
- Qualquer mudança no backend
- Qualquer mudança nos hooks de API (`carol.api.ts`)
