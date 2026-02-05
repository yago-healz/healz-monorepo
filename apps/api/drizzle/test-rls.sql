-- Script de Teste para Row-Level Security (RLS)
-- Execute este script para verificar que o RLS está funcionando corretamente

-- ============================================
-- 1. Verificar se RLS está habilitado
-- ============================================
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clinic', 'clinic_user');

-- Resultado esperado: rowsecurity = true para ambas as tabelas

-- ============================================
-- 2. Verificar políticas criadas
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('clinic', 'clinic_user');

-- Resultado esperado: Ver as políticas clinic_org_isolation e clinic_user_org_isolation

-- ============================================
-- 3. Verificar função current_org_id()
-- ============================================
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'current_org_id';

-- Resultado esperado: Ver a função SQL que retorna current_setting

-- ============================================
-- 4. Teste de Isolamento (Manual)
-- ============================================
-- NOTA: Este teste deve ser executado manualmente com dados de teste

-- 4.1 Criar dados de teste (se necessário)
-- Exemplo assumindo que você tem organizações e clínicas de teste

-- 4.2 Testar sem contexto (sem org definida)
SELECT current_org_id();
-- Resultado esperado: NULL ou vazio

SELECT COUNT(*) FROM clinic;
-- Resultado esperado: 0 (nenhuma clínica visível sem contexto)

-- 4.3 Definir contexto para org-1
SELECT set_config('app.current_org_id', 'org-1', false);

SELECT current_org_id();
-- Resultado esperado: 'org-1'

SELECT COUNT(*) FROM clinic;
-- Resultado esperado: Número de clínicas da org-1

-- 4.4 Trocar para org-2
SELECT set_config('app.current_org_id', 'org-2', false);

SELECT COUNT(*) FROM clinic;
-- Resultado esperado: Número de clínicas da org-2 (diferente de org-1)

-- 4.5 Limpar contexto
SELECT set_config('app.current_org_id', '', false);

SELECT COUNT(*) FROM clinic;
-- Resultado esperado: 0 (novamente sem acesso)

-- ============================================
-- 5. Desabilitar RLS (apenas para superuser)
-- ============================================
-- CUIDADO: Isso desabilita a proteção RLS

-- Desabilitar RLS para a sessão atual
-- SET row_security = OFF;

-- Ver todos os dados (ignorando RLS)
-- SELECT COUNT(*) FROM clinic;

-- Reabilitar RLS
-- SET row_security = ON;

-- ============================================
-- 6. Verificar performance
-- ============================================
-- Ver o plano de execução para garantir que RLS não está impactando performance

EXPLAIN ANALYZE
SELECT * FROM clinic
WHERE organization_id = current_org_id();

-- Verificar se há índice sendo usado e tempo de execução razoável
