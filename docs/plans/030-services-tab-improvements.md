# Plano 030 — Melhorias na Aba Serviços (Configurações da Clínica)

**Objetivo:** Transformar a aba de Serviços em uma CRUD funcional: sem serviços padrão, com adição, edição e deleção de serviços/procedimentos.

---

## Contexto

A aba `ServicesTab` atualmente:
- Inicializa o estado com 3 serviços hardcoded (`DEFAULT_SERVICES`) — sempre exibidos mesmo para clínicas sem nenhum serviço cadastrado
- Só sobrescreve com dados da API se `savedData.services.length > 0`
- Exibe título e descrição como texto estático (não editável)
- Não permite adicionar novos serviços
- Não permite deletar serviços

O backend já suporta todas as operações necessárias: o endpoint `PATCH /clinic-settings/:id/services` salva o array inteiro como JSONB, portanto adicionar, editar e deletar são operações puramente de estado local + save.

**Nenhuma mudança no backend é necessária.**

---

## Arquivo afetado

| Arquivo | Tipo |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx` | Modificar |

---

## Implementação

### 1. Remover `DEFAULT_SERVICES` e corrigir inicialização

- Deletar a constante `DEFAULT_SERVICES` (linhas 17–40)
- Alterar o estado inicial: `useState<Service[]>([])`
- Alterar o `useEffect` para carregar dados da API **sempre** (remover a condição `savedData.services.length > 0`):

```ts
useEffect(() => {
  if (savedData?.services !== undefined) {
    setServices(savedData.services)
    setExpandedNotes(savedData.services.filter(s => s.note).map(s => s.id))
  }
}, [savedData])
```

Também remover o `expandedNotes` inicial que depende de `DEFAULT_SERVICES`.

### 2. Adicionar função `addService`

Gera um id único (`crypto.randomUUID()`) e insere um serviço vazio no array:

```ts
const addService = () => {
  const newService: Service = {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    duration: '30',
    value: '0.00',
  }
  setServices(prev => [...prev, newService])
}
```

### 3. Adicionar função `removeService`

```ts
const removeService = (id: string) => {
  setServices(prev => prev.filter(s => s.id !== id))
  setExpandedNotes(prev => prev.filter(noteId => noteId !== id))
}
```

### 4. Tornar título e descrição editáveis

No card de cada serviço, substituir os elementos estáticos por inputs:

```tsx
// Antes (estático):
<h3 className="font-semibold text-foreground">{service.title}</h3>
<p className="text-sm text-muted-foreground">{service.description}</p>

// Depois (editável):
<Input
  value={service.title}
  onChange={(e) => updateService(service.id, 'title', e.target.value)}
  placeholder="Nome do serviço ou procedimento"
  className="font-semibold"
/>
<Input
  value={service.description}
  onChange={(e) => updateService(service.id, 'description', e.target.value)}
  placeholder="Descrição breve"
  className="text-sm text-muted-foreground mt-1"
/>
```

### 5. Adicionar botão "Deletar serviço" em cada card

Adicionar no canto superior direito do card um botão de lixeira (`Trash2` do lucide-react):

```tsx
<button
  onClick={() => removeService(service.id)}
  className="text-muted-foreground hover:text-destructive transition-colors"
  aria-label="Remover serviço"
>
  <Trash2 className="w-4 h-4" />
</button>
```

### 6. Adicionar botão "Novo serviço" no header da seção

No cabeçalho da seção (ao lado do título "Serviços e Procedimentos"), adicionar:

```tsx
<Button variant="outline" size="sm" onClick={addService}>
  <Plus className="w-4 h-4 mr-2" />
  Novo serviço
</Button>
```

O header deve usar `flex items-center justify-between` para alinhar ícone+título à esquerda e botão à direita.

### 7. Estado vazio (empty state)

Quando `services.length === 0` (e não está carregando), exibir mensagem no lugar da lista:

```tsx
{services.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
    <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
    <p className="text-sm font-medium text-foreground">Nenhum serviço cadastrado</p>
    <p className="text-sm text-muted-foreground mt-1">
      Cadastre o primeiro serviço ou procedimento da clínica.
    </p>
    <Button variant="outline" size="sm" className="mt-4" onClick={addService}>
      <Plus className="w-4 h-4 mr-2" />
      Adicionar serviço
    </Button>
  </div>
) : (
  <div className="space-y-4">
    {/* lista de cards */}
  </div>
)}
```

---

## Ordem de execução

Todas as mudanças estão no mesmo arquivo e podem ser feitas em sequência:

1. Remover `DEFAULT_SERVICES`, corrigir `useState` e `useEffect`
2. Adicionar funções `addService` e `removeService`
3. Tornar título e descrição editáveis no card
4. Adicionar botão "Deletar" no card
5. Adicionar botão "Novo serviço" no header
6. Adicionar empty state

---

## Fora do escopo

- Mudanças no backend / API
- Validação de formulário (ex: título obrigatório antes de salvar) — o botão Salvar já existente é suficiente
- Reordenação de serviços (drag-and-drop)
- Duplicar serviço
