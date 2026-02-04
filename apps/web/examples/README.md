# Exemplos de Uso - Healz Web

Este diretório contém exemplos práticos de implementação com TanStack Query e Router.

## Exemplo de Rota com Data Fetching

O arquivo `patients-route-example.tsx` demonstra:

- Como criar uma rota com TanStack Router
- Como usar loaders para carregar dados antes da renderização
- Como integrar com QueryClient para cache automático
- Como usar o hook `useLoaderData()` para acessar os dados

### Como usar este exemplo:

1. Copie o arquivo para `src/routes/patients/index.tsx`
2. Execute o dev server: `pnpm --filter @healz/web dev`
3. O TanStack Router plugin irá regenerar automaticamente o `routeTree.gen.ts`
4. Acesse http://localhost:3000/patients para ver a rota funcionando

## Exemplo de Custom Query Hook

O hook `usePatients` em `src/hooks/queries/usePatients.ts` demonstra:

- Como criar hooks reutilizáveis com useQuery
- Como criar mutations com useMutation
- Como invalidar cache após mutations
- Type-safety completa com TypeScript

### Como usar:

```typescript
import { usePatients, useCreatePatient } from "@/hooks/queries/usePatients";

function MyComponent() {
  const { data: patients, isLoading } = usePatients();
  const createPatient = useCreatePatient();

  const handleCreate = () => {
    createPatient.mutate({
      name: "João Silva",
      email: "joao@example.com"
    });
  };

  // ...
}
```

## Notas Importantes

- O TanStack Router gera automaticamente o `routeTree.gen.ts` - não edite este arquivo manualmente
- Sempre execute o dev server ao adicionar novas rotas para regenerar os tipos
- Os exemplos usam a API client configurada em `src/lib/api/client.ts`
- Para production, lembre-se de configurar a variável `VITE_API_URL` no `.env`
