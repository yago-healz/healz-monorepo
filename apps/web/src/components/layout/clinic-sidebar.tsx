import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/features/auth/api/queries'
import { useUserRole } from '@/hooks/use-user-role'
import { Link } from '@tanstack/react-router'
import {
  Bot,
  CalendarDays,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react'
import { ClinicSwitcher } from './clinic-switcher'
import { UserNav } from './user-nav'

export function ClinicSidebar() {
  const { data: user } = useCurrentUser()
  const { canManageClinic } = useUserRole()

  const navigation = [
    ...(canManageClinic
      ? [
          {
            title: 'Principal',
            items: [
              { title: 'Membros', icon: Users, href: '/clinic/members', exact: false },
              { title: 'Médicos', icon: Stethoscope, href: '/clinic/doctors', exact: false },
            ],
          },
        ]
      : []),
    {
      title: 'Clínica',
      items: [
        { title: 'Pacientes', icon: Users, href: '/clinic/patients', exact: false },
        { title: 'Agenda', icon: CalendarDays, href: '/clinic/schedule', exact: false },
      ],
    },
    ...(canManageClinic
      ? [
          {
            title: 'Carol',
            items: [
              { title: 'Carol', icon: Bot, href: '/clinic/carol/settings', exact: false },
            ],
          },
          {
            title: 'Configurações',
            items: [
              { title: 'Clínica', icon: Settings, href: '/clinic/settings', exact: false },
            ],
          },
        ]
      : []),
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ClinicSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.href}
                        activeOptions={{ exact: item.exact }}
                        activeProps={{ 'data-active': 'true' }}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {user && <UserNav user={user} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
