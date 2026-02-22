# Plano 029 — Máscara e Auto-preenchimento de CEP

**Objetivo:** Adicionar máscara brasileira (XXXXX-XXX) ao campo de CEP e preencher automaticamente os campos de endereço via API ViaCEP quando o CEP for completado.

---

## Contexto

O formulário de configurações gerais da clínica (`general-tab.tsx`) possui um campo de CEP sem máscara e sem preenchimento automático. O backend já aceita e persiste todos os campos de endereço. A integração com a API ViaCEP é feita diretamente do frontend (sem passar pelo backend), pois é uma API pública e gratuita.

**API ViaCEP:**
- Endpoint: `https://viacep.com.br/ws/{CEP}/json/`
- Resposta em caso de sucesso:
  ```json
  {
    "cep": "01001-000",
    "logradouro": "Praça da Sé",
    "complemento": "lado ímpar",
    "bairro": "Sé",
    "localidade": "São Paulo",
    "uf": "SP"
  }
  ```
- Resposta em caso de CEP inválido: `{ "erro": true }`

**Mapeamento ViaCEP → campos do formulário:**
| Campo ViaCEP | Campo do formulário |
|---|---|
| `logradouro` | `street` |
| `bairro` | `neighborhood` |
| `localidade` | `city` |
| `uf` | `state` |

O campo `complement` **não** é preenchido automaticamente (é específico do endereço da clínica). O campo `number` também não (não existe na API).

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/web/src/hooks/use-cep-lookup.ts` | **Criar** — hook compartilhado de consulta ViaCEP |
| `apps/web/src/features/clinic/components/settings/tabs/general-tab.tsx` | **Modificar** — aplicar máscara e auto-preenchimento |

> O hook é criado em `src/hooks/` (hooks compartilhados da aplicação) e não dentro da feature `clinic`, pois a consulta de CEP é uma utilidade de domínio brasileiro reutilizável em qualquer contexto (cadastro de pacientes, usuários, endereços de entrega etc.).

---

## Implementação

### 1. Hook `use-cep-lookup.ts`

Criar em `apps/web/src/hooks/use-cep-lookup.ts`.

**Responsabilidades:**
- Receber o valor bruto do campo CEP
- Retornar o valor formatado com máscara
- Consultar a API ViaCEP quando o CEP atingir 8 dígitos
- Retornar estado de loading e os dados de endereço

**Assinatura do hook:**
```ts
interface ViaCepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

interface UseCepLookupReturn {
  isLoading: boolean
  address: ViaCepAddress | null
  error: string | null
}

export function useCepLookup(rawCep: string): UseCepLookupReturn
```

**Lógica de formatação da máscara (função utilitária interna):**
```ts
function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return digits
}
```

**Lógica de busca:**
- Extrair apenas os dígitos do CEP recebido
- Só buscar quando `digits.length === 8`
- Usar `fetch` nativo (não axios, pois é uma API externa sem autenticação)
- Em caso de `{ "erro": true }`, retornar `error: 'CEP não encontrado'`
- Usar `useEffect` com debounce de 300ms para evitar requisições desnecessárias durante a digitação

**Implementação completa:**
```ts
import { useEffect, useState } from 'react'

interface ViaCepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

interface ViaCepResponse {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface UseCepLookupReturn {
  isLoading: boolean
  address: ViaCepAddress | null
  error: string | null
}

export function useCepLookup(rawCep: string): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState<ViaCepAddress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const digits = rawCep.replace(/\D/g, '')

  useEffect(() => {
    if (digits.length !== 8) {
      setAddress(null)
      setError(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      setAddress(null)

      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data: ViaCepResponse = await response.json()

        if (data.erro) {
          setError('CEP não encontrado')
        } else {
          setAddress({
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          })
        }
      } catch {
        setError('Erro ao consultar o CEP')
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [digits])

  return { isLoading, address, error }
}
```

---

### 2. Modificar `general-tab.tsx`

**Mudanças necessárias:**

#### 2a. Adicionar máscara ao campo CEP

Substituir o `<Input>` do CEP para aplicar formatação no `onChange`:

```tsx
// Antes
<Input id="zipCode" placeholder="00000-000" {...form.register('zipCode')} />

// Depois
<Input
  id="zipCode"
  placeholder="00000-000"
  {...form.register('zipCode')}
  onChange={(e) => {
    const formatted = formatCep(e.target.value)
    form.setValue('zipCode', formatted, { shouldValidate: true })
  }}
/>
```

Adicionar a função `formatCep` no topo do arquivo (fora do componente):
```ts
function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return digits
}
```

#### 2b. Usar o hook `useCepLookup` para auto-preenchimento

```tsx
const zipCodeValue = form.watch('zipCode')
const { isLoading: isCepLoading, address: cepAddress, error: cepError } = useCepLookup(zipCodeValue ?? '')
```

Usar `useEffect` para preencher os campos quando `cepAddress` mudar:
```tsx
useEffect(() => {
  if (cepAddress) {
    form.setValue('street', cepAddress.street, { shouldDirty: true })
    form.setValue('neighborhood', cepAddress.neighborhood, { shouldDirty: true })
    form.setValue('city', cepAddress.city, { shouldDirty: true })
    form.setValue('state', cepAddress.state, { shouldDirty: true })
  }
}, [cepAddress, form])
```

#### 2c. Feedback visual no campo CEP

Adicionar indicador de loading e erro abaixo do campo CEP:
```tsx
<div className="col-span-2 space-y-2">
  <Label htmlFor="zipCode">CEP</Label>
  <div className="relative">
    <Input
      id="zipCode"
      placeholder="00000-000"
      {...form.register('zipCode')}
      onChange={(e) => {
        const formatted = formatCep(e.target.value)
        form.setValue('zipCode', formatted, { shouldValidate: true })
      }}
    />
    {isCepLoading && (
      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
    )}
  </div>
  {cepError && (
    <p className="text-sm text-destructive">{cepError}</p>
  )}
</div>
```

#### 2d. Atualizar schema Zod para validar formato do CEP

```ts
zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional().or(z.literal('')),
```

---

## Ordem de execução

```
1. [Tarefa 1] Criar apps/web/src/features/clinic/hooks/use-cep-lookup.ts
2. [Tarefa 2] Modificar general-tab.tsx — depende de Tarefa 1
```

As duas tarefas são sequenciais: o hook precisa existir antes de ser importado no tab.

---

## Critérios de aceitação

- [ ] Campo CEP aceita apenas dígitos e aplica máscara XXXXX-XXX automaticamente
- [ ] Ao completar 8 dígitos no CEP, os campos street, neighborhood, city e state são preenchidos automaticamente
- [ ] Spinner de loading aparece no campo CEP durante a consulta
- [ ] Mensagem de erro aparece quando o CEP não é encontrado ou a API falha
- [ ] Campos complement e number **não** são sobrescritos pelo auto-preenchimento
- [ ] Se o usuário apagar o CEP, o erro some (mas os campos já preenchidos permanecem)
- [ ] CEP carregado do banco de dados ao abrir a página é exibido com a máscara correta

---

## Fora do escopo

- Validação de CEP no backend
- Internacionalização (outros formatos de código postal)
- Cache de consultas CEP já feitas
- Criação de componente separado para input de CEP (overkill para um único uso)
