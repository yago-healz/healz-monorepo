# Implementação: Setup do Monorepo

## Visão Geral

Configuração inicial do monorepo Healz com pnpm + Turborepo.

**Estrutura alvo:**
```
healz-monorepo/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # React + Vite
├── packages/
│   └── shared/       # Tipos e utilitários compartilhados
├── docker/
│   └── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── render.yaml
```

---

## Fase 1: Estrutura Base do Monorepo

### 1.1 Inicializar root do monorepo

```bash
# Na raiz do projeto
pnpm init
```

Editar `package.json`:
```json
{
  "name": "healz-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### 1.2 Configurar pnpm workspace

Criar `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 1.3 Configurar Turborepo

Criar `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 1.4 Criar estrutura de diretórios

```bash
mkdir -p apps/api apps/web packages/shared docker
```

---

## Fase 2: Package Compartilhado

### 2.1 Inicializar packages/shared

Criar `packages/shared/package.json`:
```json
{
  "name": "@healz/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  }
}
```

### 2.2 Criar arquivo base

Criar `packages/shared/src/index.ts`:
```typescript
// Tipos e utilitários compartilhados entre apps

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type TenantId = string;
export type UserId = string;
```

---

## Fase 3: API NestJS

### 3.1 Criar aplicação NestJS

```bash
cd apps/api
pnpm init
```

Criar `apps/api/package.json`:
```json
{
  "name": "@healz/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/config": "^3",
    "drizzle-orm": "^0.38",
    "postgres": "^3",
    "@healz/shared": "workspace:*",
    "reflect-metadata": "^0.2",
    "rxjs": "^7"
  },
  "devDependencies": {
    "@nestjs/cli": "^10",
    "@types/node": "^22",
    "drizzle-kit": "^0.30",
    "typescript": "^5",
    "eslint": "^9"
  }
}
```

### 3.2 Estrutura básica NestJS

Criar `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Criar `apps/api/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

Criar `apps/api/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API running on port ${port}`);
}

bootstrap();
```

Criar `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

Criar `apps/api/src/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### 3.3 Configuração Drizzle

Criar `apps/api/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Criar `apps/api/src/db/schema.ts`:
```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Schema base - expandir conforme documentação DATA_MODELING.md
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## Fase 4: Frontend React + Vite

### 4.1 Criar aplicação Vite

```bash
cd apps/web
pnpm create vite . --template react-ts
```

### 4.2 Atualizar package.json

Editar `apps/web/package.json`:
```json
{
  "name": "@healz/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@healz/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^6",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "@radix-ui/react-slot": "^1",
    "eslint": "^9"
  }
}
```

### 4.3 Configurar Tailwind CSS v4

Criar `apps/web/src/index.css`:
```css
@import "tailwindcss";
```

Editar `apps/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
});
```

### 4.4 Componente base com Radix

Criar `apps/web/src/components/Button.tsx`:
```tsx
import { Slot } from '@radix-ui/react-slot';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

---

## Fase 5: Docker para Desenvolvimento

### 5.1 Docker Compose

Criar `docker/docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: healz-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: healz
      POSTGRES_PASSWORD: healz_dev
      POSTGRES_DB: healz_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healz -d healz_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: healz-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 5.2 Arquivo de ambiente

Criar `apps/api/.env.example`:
```env
# Database
DATABASE_URL=postgresql://healz:healz_dev@localhost:5432/healz_dev

# Redis
REDIS_URL=redis://localhost:6379

# App
PORT=3001
NODE_ENV=development
```

### 5.3 Scripts de conveniência

Adicionar ao `package.json` raiz:
```json
{
  "scripts": {
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "docker:logs": "docker compose -f docker/docker-compose.yml logs -f",
    "db:migrate": "pnpm --filter @healz/api drizzle-kit migrate",
    "db:push": "pnpm --filter @healz/api drizzle-kit push",
    "db:studio": "pnpm --filter @healz/api drizzle-kit studio"
  }
}
```

---

## Fase 6: Validação

### 6.1 Instalar dependências

```bash
pnpm install
```

### 6.2 Testar desenvolvimento local

```bash
# Terminal 1: Subir infra
pnpm docker:up

# Terminal 2: Rodar apps
pnpm dev
```

### 6.3 Verificar endpoints

- Frontend: http://localhost:3000
- API Health: http://localhost:3001/health

---

## Checklist de Conclusão

- [ ] `pnpm install` executa sem erros
- [ ] `pnpm dev` inicia ambos os apps
- [ ] Docker Compose sobe PostgreSQL e Redis
- [ ] API responde em `/health`
- [ ] Frontend carrega com Tailwind funcionando
- [ ] `@healz/shared` é importável em ambos os apps
