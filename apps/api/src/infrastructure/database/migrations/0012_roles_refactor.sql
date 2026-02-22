-- Recriar o tipo user_role com os valores corretos
-- Migrar 'secretary' → 'receptionist' nos dados existentes

-- Passo A: Criar novo tipo com os valores desejados
CREATE TYPE "public"."user_role_new" AS ENUM('admin', 'manager', 'doctor', 'receptionist', 'viewer');
--> statement-breakpoint

-- Passo B: Migrar coluna user_clinic_roles
ALTER TABLE "user_clinic_roles"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING (
    CASE
      WHEN "role"::text = 'secretary' THEN 'receptionist'::"public"."user_role_new"
      ELSE "role"::text::"public"."user_role_new"
    END
  );
--> statement-breakpoint

-- Passo C: Migrar coluna invites
ALTER TABLE "invites"
  ALTER COLUMN "role" TYPE "public"."user_role_new"
  USING (
    CASE
      WHEN "role"::text = 'secretary' THEN 'receptionist'::"public"."user_role_new"
      ELSE "role"::text::"public"."user_role_new"
    END
  );
--> statement-breakpoint

-- Passo D: Remover tipo antigo e renomear
DROP TYPE "public"."user_role";
--> statement-breakpoint
ALTER TYPE "public"."user_role_new" RENAME TO "user_role";
