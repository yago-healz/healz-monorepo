# 05 — Frontend: Hook useMyDoctorProfile + Endpoint + Tipos

**Objetivo:** Criar o hook e infraestrutura para o frontend buscar o perfil do doctor logado.

**Depende de:** 02 (endpoint `/doctors/me` no backend)

## Arquivos

**Modificar:**
- `apps/web/src/lib/api/endpoints.ts` — adicionar constantes
- `apps/web/src/features/clinic/api/doctors.api.ts` — adicionar hook
- `apps/web/src/types/doctor.types.ts` — adicionar DTO para create-and-link (se necessario)

## Implementacao

### endpoints.ts

Adicionar dentro de `DOCTORS`:

```typescript
ME: (clinicId: string) => `/clinics/${clinicId}/doctors/me`,
CREATE_AND_LINK_PROCEDURE: (clinicId: string, doctorId: string) =>
  `/clinics/${clinicId}/doctors/${doctorId}/procedures/create`,
```

### doctors.api.ts

```typescript
/**
 * Busca o perfil do doctor logado na clinica ativa.
 * Retorna o mesmo DoctorProfile do useDoctor.
 */
export const useMyDoctorProfile = () => {
  const clinicId = tokenService.getActiveClinicId();

  return useQuery({
    queryKey: ['doctors', clinicId, 'me'],
    queryFn: async (): Promise<DoctorProfile> => {
      const response = await api.get(ENDPOINTS.DOCTORS.ME(clinicId!));
      return response.data;
    },
    enabled: !!clinicId,
  });
};
```

### doctor-procedures.api.ts

Adicionar mutation para create-and-link:

```typescript
export const useCreateAndLinkProcedure = (clinicId: string, doctorId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAndLinkProcedureDto): Promise<DoctorProcedure> => {
      const response = await api.post(
        ENDPOINTS.DOCTORS.CREATE_AND_LINK_PROCEDURE(clinicId, doctorId),
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-procedures', clinicId, doctorId] });
      queryClient.invalidateQueries({ queryKey: ['procedures', clinicId] });
      toast.success('Procedimento criado e vinculado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar procedimento');
    },
  });
};
```

### doctor.types.ts

Adicionar tipo:

```typescript
export interface CreateAndLinkProcedureDto {
  name: string;
  description?: string;
  category?: string;
  defaultDuration: number;
  price?: number;
  durationOverride?: number;
}
```

## Feito quando

- [ ] `useMyDoctorProfile()` retorna o perfil do doctor logado
- [ ] `useCreateAndLinkProcedure()` cria e vincula procedimento
- [ ] Endpoints adicionados em `endpoints.ts`
- [ ] Tipos adicionados em `doctor.types.ts`
- [ ] Compila sem erros (`pnpm exec tsc -b --noEmit` no `apps/web`)
