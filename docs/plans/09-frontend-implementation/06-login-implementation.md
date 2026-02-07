# 06 - Implementação da Tela de Login

[← Anterior: Clinics & Users](./05-queries-mutations-clinics-users.md) | [Índice](./00-index.md) | [Próximo: Dashboard →](./07-dashboard-implementation.md)

---

## 1. Componente LoginForm

### 1.1. Implementação Completa

**Arquivo:** `src/features/auth/components/login-form.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginMutation } from '../api/mutations'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data)
      navigate({ to: '/platform-admin' })
    } catch (error) {
      // Error already handled by mutation
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Entre com seu email e senha para acessar a plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
```

### 1.2. Features do LoginForm

- ✅ Validação com Zod
- ✅ React Hook Form para gerenciamento
- ✅ Mensagens de erro inline
- ✅ Loading state no botão
- ✅ Link para forgot password
- ✅ Link para signup
- ✅ Redirecionamento após login bem-sucedido

---

## 2. Rota de Login

### 2.1. Arquivo de Rota

**Arquivo:** `src/routes/_public/login.tsx`

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/components/login-form'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_public/login')({
  // Redirect if already authenticated
  beforeLoad: () => {
    if (tokenService.hasValidToken()) {
      throw redirect({ to: '/platform-admin' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  )
}
```

### 2.2. Comportamento da Rota

- Se usuário já autenticado → redireciona para `/platform-admin`
- Se não autenticado → mostra formulário de login
- Após login bem-sucedido → redireciona para dashboard

---

## 3. Layout Público

### 3.1. Arquivo de Layout

**Arquivo:** `src/routes/_public.tsx`

```typescript
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { tokenService } from '@/services/token.service'

export const Route = createFileRoute('/_public')({
  beforeLoad: () => {
    // Redirect to dashboard if already authenticated
    if (tokenService.hasValidToken()) {
      throw redirect({ to: '/platform-admin' })
    }
  },
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
```

### 3.2. Rotas Públicas

Todas as rotas dentro de `_public/` usarão este layout:
- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/accept-invite`
- `/signup`

---

## 4. Forgot Password Flow

### 4.1. Componente ForgotPasswordForm

**Arquivo:** `src/features/auth/components/forgot-password-form.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPasswordMutation } from '../api/mutations'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const navigate = useNavigate()
  const forgotPasswordMutation = useForgotPasswordMutation()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync(data)
      navigate({ to: '/login' })
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Esqueceu a senha?</CardTitle>
        <CardDescription>
          Digite seu email e enviaremos um link para redefinir sua senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 4.2. Rota Forgot Password

**Arquivo:** `src/routes/_public/forgot-password.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ForgotPasswordForm />
    </div>
  )
}
```

---

## 5. Reset Password Flow

### 5.1. Componente ResetPasswordForm

**Arquivo:** `src/features/auth/components/reset-password-form.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPasswordMutation } from '../api/mutations'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate()
  const resetPasswordMutation = useResetPasswordMutation()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: data.password,
      })
      navigate({ to: '/login' })
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Redefinir Senha</CardTitle>
        <CardDescription>
          Digite sua nova senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 5.2. Rota Reset Password

**Arquivo:** `src/routes/_public/reset-password.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'
import { z } from 'zod'

const resetPasswordSearchSchema = z.object({
  token: z.string(),
})

export const Route = createFileRoute('/_public/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()

  if (!token) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ResetPasswordForm token={token} />
    </div>
  )
}
```

---

## 6. Guards de Autenticação

### 6.1. Hook useAuthGuard

**Arquivo:** `src/hooks/use-auth-guard.ts`

```typescript
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { tokenService } from '@/services/token.service'

export function useAuthGuard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!tokenService.hasValidToken()) {
      navigate({ to: '/login' })
    }
  }, [navigate])
}
```

### 6.2. Uso em Componentes

```typescript
import { useAuthGuard } from '@/hooks/use-auth-guard'

function ProtectedPage() {
  useAuthGuard() // Redireciona se não autenticado

  return <div>Conteúdo protegido</div>
}
```

**Nota:** Preferir usar `beforeLoad` nas rotas ao invés de hook em componentes.

---

## 7. Verify Email Flow

### 7.1. Componente VerifyEmail

**Arquivo:** `src/features/auth/components/verify-email.tsx`

```typescript
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useVerifyEmailMutation } from '../api/mutations'

export function VerifyEmail({ token }: { token: string }) {
  const navigate = useNavigate()
  const verifyMutation = useVerifyEmailMutation()

  useEffect(() => {
    verifyMutation.mutate(token)
  }, [token])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verificação de Email</CardTitle>
        <CardDescription>
          {verifyMutation.isPending && 'Verificando seu email...'}
          {verifyMutation.isSuccess && 'Email verificado com sucesso!'}
          {verifyMutation.isError && 'Erro ao verificar email'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {verifyMutation.isPending && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
        {verifyMutation.isSuccess && <CheckCircle className="h-12 w-12 text-green-500" />}
        {verifyMutation.isError && <XCircle className="h-12 w-12 text-red-500" />}

        {verifyMutation.isSuccess && (
          <Button onClick={() => navigate({ to: '/login' })}>
            Ir para Login
          </Button>
        )}
        {verifyMutation.isError && (
          <Button variant="outline" onClick={() => navigate({ to: '/login' })}>
            Voltar para Login
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 8. Checklist de Implementação

### Fase 2: Autenticação (2-3 dias)

- [ ] Criar `src/features/auth/components/login-form.tsx`
- [ ] Criar `src/routes/_public.tsx` (layout público)
- [ ] Criar `src/routes/_public/login.tsx`
- [ ] Criar `src/features/auth/components/forgot-password-form.tsx`
- [ ] Criar `src/routes/_public/forgot-password.tsx`
- [ ] Criar `src/features/auth/components/reset-password-form.tsx`
- [ ] Criar `src/routes/_public/reset-password.tsx`
- [ ] Criar `src/features/auth/components/verify-email.tsx`
- [ ] Criar `src/routes/_public/verify-email.tsx`
- [ ] Criar `src/hooks/use-auth-guard.ts`
- [ ] Testar fluxo completo de autenticação

---

## 9. Testes a Realizar

### 9.1. Login

- [ ] Login com credenciais válidas
- [ ] Login com credenciais inválidas
- [ ] Validação de email
- [ ] Validação de senha
- [ ] Redirecionamento após login
- [ ] Persistência de sessão

### 9.2. Forgot Password

- [ ] Envio de email de recuperação
- [ ] Validação de email
- [ ] Feedback de sucesso

### 9.3. Reset Password

- [ ] Reset com token válido
- [ ] Reset com token inválido
- [ ] Validação de senhas iguais
- [ ] Redirecionamento após reset

### 9.4. Verify Email

- [ ] Verificação com token válido
- [ ] Verificação com token inválido
- [ ] Feedback visual

---

## 10. Próximos Passos

Após implementar o login:

1. Criar layout autenticado com sidebar ([07 - Dashboard](./07-dashboard-implementation.md))
2. Implementar proteção de rotas autenticadas
3. Construir dashboard overview

---

[← Anterior: Clinics & Users](./05-queries-mutations-clinics-users.md) | [Índice](./00-index.md) | [Próximo: Dashboard →](./07-dashboard-implementation.md)
