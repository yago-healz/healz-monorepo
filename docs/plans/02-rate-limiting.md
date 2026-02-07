# Plano: Rate Limiting

## Contexto

Não existe proteção contra brute force em nenhum endpoint da API. Um atacante pode tentar infinitas combinações de email/senha em `/auth/login`. O `@nestjs/throttler` resolve isso de forma simples e integrada ao NestJS.

Limites maiores em desenvolvimento evitam frustração durante testes manuais e automatizados.

## Arquivos Afetados

- `apps/api/package.json` — nova dependência
- `apps/api/src/app.module.ts` — registrar ThrottlerModule
- `apps/api/src/auth/auth.controller.ts` — limites específicos para endpoints de auth

## Passos

### 1. Instalar dependência

```bash
cd apps/api
pnpm add @nestjs/throttler
```

### 2. Configurar ThrottlerModule em `app.module.ts`

Registrar o módulo com limites que variam por ambiente. Usar `ConfigService` para determinar se estamos em desenvolvimento.

```typescript
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "apps/api/.env" }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get("NODE_ENV") !== "production";
        return [
          {
            name: "short",
            ttl: 1000,   // 1 segundo
            limit: isDev ? 50 : 3,  // dev: 50 req/s | prod: 3 req/s
          },
          {
            name: "medium",
            ttl: 60000,  // 1 minuto
            limit: isDev ? 500 : 60, // dev: 500 req/min | prod: 60 req/min
          },
        ];
      },
    }),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  // ... middleware existente
}
```

**Sobre os limites globais:**
- `short`: previne spam rápido (múltiplos requests por segundo)
- `medium`: limita uso geral por minuto
- Em dev os limites são ~15x maiores para não atrapalhar

### 3. Aplicar limites específicos nos endpoints de auth

Os endpoints de autenticação precisam de limites mais restritivos que o padrão global. Usar `@Throttle()` para sobrescrever.

**Em `auth.controller.ts`**:

```typescript
import { Throttle, SkipThrottle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post("login")
  @HttpCode(200)
  @Throttle({
    short: { ttl: 1000, limit: 1 },    // 1 tentativa por segundo
    medium: { ttl: 60000, limit: 5 },   // 5 tentativas por minuto
  })
  async login(/* ... */) { /* ... */ }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({
    short: { ttl: 1000, limit: 2 },
    medium: { ttl: 60000, limit: 20 },
  })
  async refresh(/* ... */) { /* ... */ }

  // switch-context e logout podem usar os limites globais
}
```

Para ajustar os limites de auth também por ambiente, injetar `ConfigService` e usar um guard customizado ou aplicar a lógica direto. Porém, a abordagem mais simples é: os limites de auth no controller são para produção. Em dev, o ThrottlerGuard global já terá limites altos — e como o Throttler usa o **menor** limite entre global e per-route, precisamos de uma abordagem diferente.

**Abordagem recomendada**: criar um decorator helper:

```typescript
// src/auth/decorators/auth-throttle.decorator.ts
import { Throttle } from "@nestjs/throttler";

export function AuthThrottle(env: string) {
  const isDev = env !== "production";
  return Throttle({
    short: { ttl: 1000, limit: isDev ? 20 : 1 },
    medium: { ttl: 60000, limit: isDev ? 200 : 5 },
  });
}
```

Na prática, a forma mais limpa é definir os limites no controller usando variáveis de ambiente via `ConfigService`, mas como `@Throttle()` é um decorator (tempo de definição de classe, não de execução), a melhor opção é definir os valores via env direto no factory do módulo e usar `@Throttle()` com valores fixos para produção, sabendo que o global já é relaxado em dev.

**Abordagem final simplificada**: manter `@Throttle()` com valores de produção no controller. O ThrottlerGuard respeita o limite per-route. Em dev, se os limites atrapalharem, usar `@SkipThrottle()` condicional não é possível via decorator. A solução pragmática:

```typescript
// app.module.ts - ThrottlerModule config
ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const isDev = config.get("NODE_ENV") !== "production";
    if (isDev) {
      // Em dev, limites muito altos (basicamente desabilitado)
      return [{ ttl: 1000, limit: 1000 }];
    }
    return [
      { name: "short", ttl: 1000, limit: 3 },
      { name: "medium", ttl: 60000, limit: 60 },
    ];
  },
}),
```

E no controller, usar `@Throttle()` apenas para produção (os per-route limits só são enforced se os named throttlers existirem):

```typescript
@Post("login")
@HttpCode(200)
@Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 tentativas por minuto
async login(/* ... */) { /* ... */ }
```

### 4. Excluir health check do rate limiting

```typescript
// health.controller.ts
import { SkipThrottle } from "@nestjs/throttler";

@SkipThrottle()
@Controller("health")
export class HealthController { /* ... */ }
```

### 5. Testar

```bash
# Testar rate limiting no login (deve receber 429 após exceder limite)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

Em produção, a partir da 6a tentativa em 1 minuto, deve retornar HTTP 429 (Too Many Requests).

## Resultado Esperado

- Proteção global contra abuso em todos os endpoints
- Limites mais restritivos em endpoints de auth (login, refresh)
- Em desenvolvimento, limites altos para não atrapalhar
- Em produção, proteção efetiva contra brute force
- Health check excluído do rate limiting
