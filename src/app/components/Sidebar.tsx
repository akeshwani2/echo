'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Key, 
  FileText, 
  TerminalSquareIcon
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', href: '/' },
    { icon: TerminalSquareIcon, label: 'Playground', href: '/playground' },
    { icon: Key, label: 'API Keys', href: '/playground/keys' },
    { icon: FileText, label: 'Docs', href: '/docs' },
  ];

  return (
    <div className="w-16 h-screen bg-black border-r border-zinc-800 flex flex-col items-center py-4">
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
            className={`w-4 h-4 ${
              pathname === item.href ? 'text-white' : 'text-zinc-400'
            } group-hover:text-white`}
          />
        </Link>
      ))}
    </div>
  );
}