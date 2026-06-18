'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  HardDrive, LayoutDashboard, Files, FolderOpen, Share2, Clock,
  Trash2, Search, BarChart2, Users, Key, ScrollText, Settings, Code2,
  Activity, ChevronRight, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Files', icon: Files, href: '/dashboard/files' },
  { label: 'Folders', icon: FolderOpen, href: '/dashboard/folders' },
  { label: 'Shared', icon: Share2, href: '/dashboard/shared' },
  { label: 'Recent', icon: Clock, href: '/dashboard/recent' },
  { label: 'Trash', icon: Trash2, href: '/dashboard/trash' },
  { label: 'Search', icon: Search, href: '/dashboard/search' },
];

const managementItems = [
  { label: 'Storage', icon: BarChart2, href: '/dashboard/storage' },
  { label: 'Users', icon: Users, href: '/dashboard/users', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'API Keys', icon: Key, href: '/dashboard/api-keys', roles: ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER'] },
  { label: 'Audit Logs', icon: ScrollText, href: '/dashboard/logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'System', icon: Activity, href: '/dashboard/system', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Developer', icon: Code2, href: '/dashboard/developer' },
];

function NavItem({ item, collapsed }: { item: { label: string; icon: any; href: string }; collapsed: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

  return (
    <Link href={item.href}>
      <motion.div
        whileHover={{ x: 2 }}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group relative',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
        )}
      >
        <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-sidebar-primary-foreground' : '')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
      </motion.div>
    </Link>
  );
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuthStore();

  const filteredManagement = managementItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar h-screen border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-3 p-4 border-b border-sidebar-border', collapsed && 'justify-center')}>
        <img src="/favicon.ico" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sidebar-foreground text-sm leading-tight truncate">RGV911 Drive</p>
            <p className="text-xs text-sidebar-foreground/50 leading-tight">Cloud Storage</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 hide-scrollbar">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <div className="pt-4 pb-1">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Management</p>
          </div>
        )}
        {collapsed && <div className="pt-4 border-t border-sidebar-border" />}

        {filteredManagement.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-foreground">
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.displayName || user?.username}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={() => logout()} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => logout()} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
