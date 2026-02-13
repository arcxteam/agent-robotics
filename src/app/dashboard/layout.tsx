'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Factory,
  Bot,
  ListTodo,
  BarChart3,
  Settings,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  HardHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimulationProvider } from '@/lib/simulation-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Simulation', href: '/dashboard/simulation', icon: HardHat },
  { name: 'Environments', href: '/dashboard/environments', icon: Factory },
  { name: 'Robots', href: '/dashboard/robots', icon: Bot },
  { name: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-slate-800/20 bg-[#0a0a12] transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/20">
            {sidebarOpen && (
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/30">
                  <Image src="/arc-spatial-cyan.png" alt="ARC SPATIAL Logo" width={40} height={40} className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-bold text-gradient-primary">ARC SPATIAL</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-gradient-primary text-white shadow-lg'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', !sidebarOpen && 'mx-auto')} />
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="bg-gradient-to-r border-t border-slate-800/20 p-4">
            {sidebarOpen ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <Avatar className="w-8 h-8 mr-3">
                      <AvatarImage src="/arc-spatial-cyan.png" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">John Doe</p>
                      <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Avatar className="w-8 h-8 mx-auto cursor-pointer">
                <AvatarImage src="/arc-spatial-cyan.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800/20 bg-[#0a0a12]/95 backdrop-blur-sm">
          <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center flex-1">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-10 max-w-md bg-slate-900/50 border-slate-800/30 focus:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button className="btn-gradient-to-r" asChild>
                <Link href="/dashboard/simulation">
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Start
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-5">
          <SimulationProvider>
            {children}
          </SimulationProvider>
        </main>
      </div>
    </div>
  );
}
