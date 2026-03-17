# Plano 041 — Unificação da Página de Configurações (Carol + Clínica)

**Objetivo:** Consolidar as páginas `/clinic/carol/settings` e `/clinic/settings` em uma única tela com duas abas horizontais principais (Carol | Clínica), sub-abas internas e Playground fixo à direita.

---

## Contexto

Hoje as configurações estão em duas rotas separadas:
- `/clinic/carol/settings` → `CarolPage` + `CarolSettingsForm`
- `/clinic/settings` → `ClinicSettingsPage` com 7 sub-abas verticais

A unificação melhora a navegabilidade e deixa claro que os dados da aba Carol alimentam diretamente o comportamento da assistente.

## Decisões de design

| Decisão | Escolha |
|---|---|
| Layout da página | Split horizontal: conteúdo (flex-1) + playground fixo à direita |
| Navegação principal | Abas horizontais: Carol \| Clínica (estilo tabs do Shadcn) |
| Navegação secundária | Sub-abas verticais à esquerda (igual ao padrão atual da Clínica) |
| URL | `mainTab` + `subTab` como search params |
| Formulário Carol | Estado único no nível do CarolTab; Contexto da Clínica é form separado |
| Playground | Só aparece na aba Carol (mesma lógica de toggle que existe hoje) |
| Notificações | Sub-aba dentro de Clínica |

## Arquivos afetados

### Modificar
- `apps/web/src/routes/_authenticated/clinic/settings.tsx` — novo schema de search params
- `apps/web/src/features/clinic/components/settings/tabs/connectors-tab.tsx` — ajustar import do Route

### Criar
- `apps/web/src/features/clinic/components/settings/unified-settings-page.tsx`
- `apps/web/src/features/carol/components/carol-tab.tsx`
- `apps/web/src/features/carol/components/subtabs/identity-subtab.tsx`
- `apps/web/src/features/carol/components/subtabs/behavior-subtab.tsx`
- `apps/web/src/features/carol/components/subtabs/clinic-context-subtab.tsx`
- `apps/web/src/features/clinic/components/settings/clinica-tab.tsx`

### Deletar
- `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx` — rota obsoleta
- `apps/web/src/features/carol/components/carol-page.tsx` — substituído por UnifiedSettingsPage
- `apps/web/src/features/carol/components/carol-settings-page.tsx` — dead code

## Ordem de execução

```
1. [01-unified-route.md]       — atualiza schema de URL (bloqueante para todos)
2. [02-page-layout.md]         — cria UnifiedSettingsPage + wiring de tabs
3. [03-carol-tab.md]           — Carol tab com 3 sub-abas  } paralelos entre si
   [04-clinica-tab.md]         — Clínica tab reorganizada  } após tarefa 2
4. [05-cleanup.md]             — deleta arquivos obsoletos (requer 02+03+04)
```

## Fora do escopo

- Mudanças em backend / endpoints de API
- Refatoração da lógica interna de qualquer tab existente (só mover/reorganizar)
- Responsividade mobile
- Novo campo não existente hoje
