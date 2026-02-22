# Plano 024 — Fix: Notas internas na aba Serviços

**Objetivo:** Corrigir o comportamento da seção de notas internas para Carol na aba Serviços — exibir a caixa de texto ao clicar em "Adicionar notas internas para Carol" e permitir excluí-la.

---

## Contexto

**Arquivo:** `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx`

### Bug atual

A condição na linha 142 exige `service.note` ser truthy para mostrar o textarea:

```tsx
{expandedNotes.includes(service.id) && service.note ? (
  // textarea
) : (
  // botão "+Adicionar notas..."
)}
```

Resultado: clicar em "Adicionar notas internas para Carol" chama `toggleNotes(id)`, que adiciona o ID a `expandedNotes`, mas o textarea **nunca aparece** porque `service.note` é `undefined`/`''`. Só o serviço "Procedimentos" funciona porque já possui `note` preenchido no estado inicial.

### Comportamento desejado

1. Clicar em "Adicionar notas internas para Carol" → exibe o textarea (mesmo sem conteúdo prévio).
2. Com o textarea visível, há um botão **X** (ou "Excluir nota") que:
   - Remove o serviço de `expandedNotes`.
   - Limpa o campo `note` do serviço.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/services-tab.tsx` | Modificar |

---

## Implementação

### 1. Corrigir a condição de exibição

Mudar a condição para depender **somente** de `expandedNotes`:

```tsx
// ANTES
{expandedNotes.includes(service.id) && service.note ? (

// DEPOIS
{expandedNotes.includes(service.id) ? (
```

### 2. Adicionar função `removeNote`

Adicionar função que remove o serviço de `expandedNotes` e limpa o campo `note`:

```tsx
const removeNote = (id: string) => {
  setExpandedNotes(prev => prev.filter(noteId => noteId !== id))
  updateService(id, 'note', '')
}
```

### 3. Adicionar botão de exclusão no cabeçalho da nota

Importar `X` de `lucide-react` e adicionar botão ao lado do label "Nota para Carol:":

```tsx
import { Plus, Briefcase, Loader2, X } from 'lucide-react'

// No bloco do textarea expandido:
<div className="mt-4 p-4 bg-pink-50 rounded-lg">
  <div className="flex items-center justify-between mb-1">
    <p className="text-xs text-pink-500 uppercase tracking-wide">
      Nota para Carol:
    </p>
    <button
      onClick={() => removeNote(service.id)}
      className="text-pink-400 hover:text-pink-600 transition-colors"
      aria-label="Excluir nota"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
  <textarea
    value={service.note ?? ''}
    onChange={(e) => updateService(service.id, 'note', e.target.value)}
    className="w-full text-sm text-foreground bg-transparent focus:outline-none resize-none"
    rows={2}
    placeholder="Adicione instruções ou observações para Carol..."
  />
</div>
```

### 4. Garantir que `note` seja inicializado como string vazia

No `toggleNotes`, ao expandir um serviço sem nota, inicializar `note` como `''` para evitar `undefined` no textarea:

```tsx
const toggleNotes = (id: string) => {
  if (!expandedNotes.includes(id)) {
    // Garante que o campo note existe (mesmo que vazio)
    setServices(prev =>
      prev.map(s => s.id === id && s.note === undefined ? { ...s, note: '' } : s)
    )
  }
  setExpandedNotes(prev =>
    prev.includes(id)
      ? prev.filter(noteId => noteId !== id)
      : [...prev, id]
  )
}
```

---

## Ordem de execução

1. Adicionar `removeNote` + ajustar `toggleNotes`
2. Corrigir condição de renderização
3. Atualizar JSX (botão X + placeholder no textarea)

Todas as alterações são no mesmo arquivo e podem ser feitas em sequência.

---

## Fora do escopo

- Persistência no backend (o Save já existente cobre isso).
- Mudanças no tipo `Service` (campo `note` já é opcional: `note?: string`).
- Outros tabs de configurações da clínica.
