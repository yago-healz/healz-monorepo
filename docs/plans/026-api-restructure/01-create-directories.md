# Task 01 — Criar Estrutura de Diretórios

**Objetivo:** Criar a hierarquia de pastas vazia que receberá os arquivos movidos.

---

## Diretórios a criar

```bash
mkdir -p apps/api/src/common/{decorators,guards,interceptors,interfaces,swagger,dto}
mkdir -p apps/api/src/infrastructure/{database,event-sourcing,audit,mail}
mkdir -p apps/api/src/modules
```

## Done when

- As 3 pastas raiz existem: `common/`, `infrastructure/`, `modules/`
- Sub-pastas de `common/` existem
- Sub-pastas de `infrastructure/` existem
