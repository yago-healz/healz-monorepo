import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
} from 'lucide-react'
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
import { ClinicSwitcher } from './clinic-switcher'
import { UserNav } from './user-nav'

const navigation = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/clinic',
      },
      {
        title: 'Membros',
        icon: Users,
        href: '/clinic/members',
      },
      {
        title: 'Agenda',
        icon: Calendar,
        href: '/clinic/schedule',
      },
    ],
  },
  {
    title: 'Configurações',
    items: [
      {
        title: 'Clínica',
        icon: Settings,
        href: '/clinic/settings',
      },
    ],
  },
]

export function ClinicSidebar() {
  const { data: user } = useCurrentUser()

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
                      <Link to={item.href}>
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
