# Fase 2: ListDoctorsTool — Listar Médicos da Clínica

## Objetivo

Dar à Carol a capacidade de responder perguntas como:
- "Quais médicos atendem na clínica?"
- "Quero agendar com o Dr. Ricardo"
- "Tem oftalmologista disponível?"
- "Quem faz limpeza de pele?"

## Design da Tool

### Nome: `list_doctors`

### Descrição para o LLM:
```
Lista os médicos que atendem nesta clínica. Pode filtrar por nome, especialidade ou procedimento.
Use quando o paciente perguntar sobre médicos, especialidades, ou quando precisar encontrar
um profissional para determinado procedimento.
```

### Schema de Input:
```typescript
z.object({
  name: z.string().optional()
    .describe('Nome ou parte do nome do médico (ex: "Ricardo", "Dra. Vitória")'),
  specialty: z.string().optional()
    .describe('Especialidade desejada (ex: "oftalmologista", "dermatologista", "cardiologia")'),
  procedure: z.string().optional()
    .describe('Procedimento/serviço desejado (ex: "limpeza de pele", "consulta geral")'),
})
```

### Schema de Output:
```typescript
{
  doctors: Array<{
    doctorId: string         // ID do doctor_profiles (usado nas outras tools)
    name: string             // Nome do médico
    specialty: string | null // Especialidade
    crm: string | null       // Registro profissional
    bio: string | null       // Biografia/descrição curta
    procedures: Array<{      // Procedimentos que este médico realiza
      name: string
      category: string | null
      price: string | null   // "R$ 150.00" ou null
      duration: number       // minutos
    }>
  }>
  total: number
}
```

## Implementação

Arquivo: `apps/api/src/modules/carol/tools/list-doctors.tool.ts`

### Query Strategy:

```typescript
async _call(input: { name?: string; specialty?: string; procedure?: string }): Promise<string> {
  // 1. Base query: buscar médicos ativos vinculados à clínica
  //    JOIN: doctor_clinics → doctor_profiles → users
  //    WHERE: doctor_clinics.clinicId = this.clinicId
  //           AND doctor_clinics.isActive = true
  //           AND doctor_profiles.isActive = true

  // 2. Filtros (aplicados em memória por serem buscas fuzzy):
  //    - name: ILIKE no users.name (ex: "%ricardo%" ou "%vitória%")
  //    - specialty: ILIKE no doctor_profiles.specialty (ex: "%oftalmo%")

  // 3. Para cada médico encontrado, buscar procedimentos:
  //    JOIN: doctor_clinic_procedures → procedures
  //    WHERE: doctor_clinic_procedures.doctorClinicId = link.id
  //           AND doctor_clinic_procedures.isActive = true

  // 4. Se input.procedure fornecido:
  //    Filtrar médicos que têm pelo menos um procedimento com nome ILIKE "%procedure%"

  // 5. Retornar lista formatada
}
```

### Decisões Importantes:

1. **Busca fuzzy por nome**: Usar `ILIKE` com `%termo%` para que "Ricardo" encontre "Dr. Ricardo Silva"
2. **Busca fuzzy por especialidade**: "oftalmologista" deve encontrar "Oftalmologia" — normalizar removendo sufixos comuns (-ista → -ia, -ologista → -ologia) ou usar ILIKE simples
3. **Filtro por procedimento**: Busca pelo nome do procedimento na tabela `procedures` vinculada ao médico
4. **Sem filtros = lista completa**: Se nenhum filtro, retorna todos os médicos ativos da clínica
5. **`doctorId` retornado**: É o `doctor_profiles.id` — será usado como input para `GetDoctorAvailabilityTool` e `CreateAppointmentTool`

### Normalização de Especialidade:

O LLM pode enviar "oftalmologista" mas o campo pode ter "Oftalmologia". Para maximizar match:

```typescript
// Abordagem simples: ILIKE com o termo e variações
// "oftalmologista" → buscar ILIKE '%oftalmo%'
// "cardiologia" → buscar ILIKE '%cardio%'
// Extrair raiz da palavra (primeiros 5-6 chars) para match mais flexível

function normalizeSpecialtySearch(term: string): string {
  // Remove sufixos comuns e usa raiz
  const cleaned = term.toLowerCase()
    .replace(/logista$/, '')
    .replace(/logia$/, '')
    .replace(/ista$/, '')
    .replace(/ia$/, '')
  // Usar pelo menos 4 chars para evitar matches muito genéricos
  return cleaned.length >= 4 ? cleaned : term.toLowerCase()
}
```

## Dependências

- `DoctorService` (já existe) — mas a tool fará queries diretas ao DB para manter independência das tools (padrão existente)
- Tabelas: `doctor_clinics`, `doctor_profiles`, `users`, `doctor_clinic_procedures`, `procedures`

## Integração com `carol-chat.service.ts`

```typescript
// Em createTools():
private createTools(clinicId: string): StructuredTool[] {
  return [
    new GetClinicInfoTool(clinicId, this.clinicSettingsService),
    new ListDoctorsTool(clinicId),                    // NOVO
    new GetDoctorAvailabilityTool(clinicId, ...),     // Fase 3
    new GetServicesTool(clinicId),                    // Evoluído na Fase 5
    new CreateAppointmentTool(clinicId, ...),         // Reescrito na Fase 4
    new GetPaymentMethodsTool(clinicId),
    new FindOrCreatePatientTool(clinicId),            // Fase 1
    new GetPatientAppointmentsTool(clinicId),         // Fase 5
  ]
}
```

## Exemplos de Uso pelo LLM

### Cenário 1: "Quais médicos atendem aqui?"
```
Carol chama: list_doctors({})
→ Retorna todos os médicos com suas especialidades
→ Carol formata: "Temos o Dr. Ricardo (Oftalmologia), a Dra. Vitória (Dermatologia)..."
```

### Cenário 2: "Quero marcar com o Dr. Ricardo"
```
Carol chama: list_doctors({ name: "Ricardo" })
→ Retorna médico(s) com "Ricardo" no nome
→ Carol confirma: "Encontrei o Dr. Ricardo Silva, oftalmologista. Para qual data?"
→ Depois: get_doctor_availability({ doctorId: "xxx", date: "2026-03-25" })
```

### Cenário 3: "Preciso de um oftalmologista"
```
Carol chama: list_doctors({ specialty: "oftalmologista" })
→ Retorna médicos com especialidade matching "oftalmo"
→ Carol: "Temos o Dr. Ricardo Silva, oftalmologista. Gostaria de agendar?"
```

### Cenário 4: "Quero fazer uma limpeza de pele"
```
Carol chama: list_doctors({ procedure: "limpeza de pele" })
→ Filtra médicos que têm esse procedimento vinculado
→ Carol: "A Dra. Vitória realiza limpeza de pele. O valor é R$ 200,00 e a duração é de 45 minutos."
```

## Testes

1. **Sem filtros** → retorna todos os médicos ativos da clínica
2. **Filtro por nome** → match parcial case-insensitive
3. **Filtro por especialidade** → match fuzzy (oftalmologista → Oftalmologia)
4. **Filtro por procedimento** → retorna apenas médicos que fazem o procedimento
5. **Combinação de filtros** → specialty + procedure
6. **Médico inativo** → não aparece nos resultados
7. **Clínica sem médicos** → retorna lista vazia com mensagem adequada
8. **Procedimento inexistente** → retorna lista vazia
