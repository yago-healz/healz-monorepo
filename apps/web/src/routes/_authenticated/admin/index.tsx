import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Hospital, Users, Activity } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: PlatformAdminDashboard,
})

function PlatformAdminDashboard() {
  // TODO: Fetch real stats from API
  const stats = [
    {
      title: 'Organizações',
      value: '24',
      icon: Building2,
      description: '+2 este mês',
    },
    {
      title: 'Clínicas',
      value: '156',
      icon: Hospital,
      description: '+12 este mês',
    },
    {
      title: 'Usuários',
      value: '1,429',
      icon: Users,
      description: '+89 este mês',
    },
    {
      title: 'Ativas',
      value: '98%',
      icon: Activity,
      description: 'Taxa de ativação',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma Healz
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TODO: Add charts and recent activity */}
    </div>
  )
}
