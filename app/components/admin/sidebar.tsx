// components/admin/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Users,
  Settings,
  FileText,
  TrendingUp,
  Database,
  Home,
  Shield
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Sessions',
    href: '/admin/sessions',
    icon: Users,
  },
  // {
  //   name: 'Reports',
  //   href: '/admin/reports',
  //   icon: FileText,
  // },
  // {
  //   name: 'Performance',
  //   href: '/admin/performance',
  //   icon: TrendingUp,
  // },
  // {
  //   name: 'Data Export',
  //   href: '/admin/export',
  //   icon: Database,
  // },
  // {
  //   name: 'Settings',
  //   href: '/admin/settings',
  //   icon: Settings,
  // },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold">ZCF</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-gray-500">
          <p>ZCF v1.0</p>
          <p>© 2025 Admin Panel</p>
        </div>
      </div>
    </div>
  );
}