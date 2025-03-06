'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Key, 
  FileText 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Key, label: 'API Keys', href: '/dashboard/keys' },
    { icon: FileText, label: 'Docs', href: '/docs' },
  ];

  return (
    <div className="w-16 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`p-3 rounded-lg mb-2 transition-colors hover:bg-zinc-800 group ${
            pathname === item.href ? 'bg-zinc-800' : ''
          }`}
          title={item.label}
        >
          <item.icon
            className={`w-6 h-6 ${
              pathname === item.href ? 'text-white' : 'text-zinc-400'
            } group-hover:text-white`}
          />
        </Link>
      ))}
    </div>
  );
}