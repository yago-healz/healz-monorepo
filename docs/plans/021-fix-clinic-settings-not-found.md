# Plano 021 — Fix: Clinic Settings Tabs — "Não Encontrado" Mostra Toast de Erro

**Objetivo:** Corrigir o comportamento das abas de configurações da clínica para que, quando não existem dados salvos, o formulário seja exibido com valores padrão (sem toast de erro), permitindo ao usuário criar as configurações pela primeira vez.

---

## Contexto

Ao abrir qualquer aba de configurações (Objetivos, Serviços, Agendamentos, Carol, Notificações) em uma clínica sem dados salvos, o fluxo atual é:

1. GET `/clinics/{clinicId}/settings/{tab}` → backend retorna **404 NotFoundException**
2. Interceptor global do Axios captura o erro e exibe **toast de erro** com a mensagem do backend
3. React Query marca a query como falha
4. O componente exibe o spinner de loading indefinidamente (a aba nunca renderiza o formulário)

**Comportamento correto:** Se não há dados, exibir o formulário com valores padrão e permitir salvar (o PATCH já faz upsert — funciona para criar e atualizar).

**Root cause:** Os métodos GET no `ClinicSettingsService` lançam `NotFoundException` quando nenhum registro é encontrado. Para páginas de configurações, "sem dados" não é um erro — é o estado inicial.

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `apps/api/src/clinic-settings/clinic-settings.service.ts` | Modificar: remover `NotFoundException`, retornar `null` |
| `apps/web/src/features/clinic/api/clinic-settings.api.ts` | Modificar: tipos de retorno para `T \| null` |

> Os componentes das abas (`objectives-tab.tsx`, `services-tab.tsx`, etc.) **não precisam de mudança** — todos já usam `if (savedData) { ... }` no `useEffect`, o que lida corretamente com `null`.

---

## Implementação

### 1. Backend — `clinic-settings.service.ts`

Nos 5 métodos GET, substituir o bloco:
```ts
if (!result.length) {
  throw new NotFoundException('...')
}
return result[0]
```

Por:
```ts
return result[0] ?? null
```

Fazer isso para todos os métodos: `getObjectives`, `getServices`, `getScheduling`, `getCarolSettings`, `getNotifications`.

Não é necessário alterar a assinatura do método no controller (NestJS serializa `null` como corpo `null` com status 200).

### 2. Frontend — `clinic-settings.api.ts`

Atualizar os tipos de retorno das 5 queries para permitir `null`:

```ts
// Antes
queryFn: async (): Promise<ClinicObjectivesResponse> => { ... }

// Depois
queryFn: async (): Promise<ClinicObjectivesResponse | null> => { ... }
```

Fazer isso para todos os hooks: `useClinicObjectives`, `useClinicServices`, `useClinicScheduling`, `useClinicCarolSettings`, `useClinicNotifications`.

---

## Ordem de Execução

As duas mudanças são independentes e podem ser feitas em paralelo:

```
1. [Backend] clinic-settings.service.ts → retornar null em vez de NotFoundException
2. [Frontend] clinic-settings.api.ts   → ajustar tipos de retorno para T | null
```

Ambas são necessárias antes de testar o fluxo completo.

---

## Verificação

Após implementar:
1. Abrir `/clinic/settings` em uma clínica sem configurações salvas
2. Nenhum toast de erro deve aparecer
3. O formulário deve renderizar com os valores padrão de cada aba
4. Salvar deve funcionar (upsert cria o registro na primeira vez)
5. Reabrir a aba deve carregar os dados salvos

---

## Fora do Escopo

- Implementar as abas Geral e Conectores (ainda placeholders)
- Adicionar validação de formulário no frontend
- Alterar a lógica de upsert dos endpoints PATCH
