import { Link } from '@tanstack/react-router'
import {
  Building2,
  Hospital,
  Users,
  LayoutDashboard,
  Settings,
  Shield,
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
import { UserNav } from './user-nav'

const navigation = [
  {
    title: 'Platform Admin',
    items: [
      {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/admin',
      },
      {
        title: 'Organizações',
        icon: Building2,
        href: '/admin/organizations',
      },
      {
        title: 'Clínicas',
        icon: Hospital,
        href: '/admin/clinics',
      },
      {
        title: 'Usuários',
        icon: Users,
        href: '/admin/users',
      },
      {
        title: 'Admins',
        icon: Shield,
        href: '/admin/admins',
      },
    ],
  },
  {
    title: 'Configurações',
    items: [
      {
        title: 'Perfil',
        icon: Settings,
        href: '/settings/profile',
      },
    ],
  },
]

export function AppSidebar() {
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hospital className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Healz</span>
            <span className="truncate text-xs">Platform Admin</span>
          </div>
        </div>
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
