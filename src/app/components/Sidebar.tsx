'use client'
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Key, 
  FileText, 
  TerminalSquareIcon,
  Mail,
  LucideBrain,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import ProtocolLogo from '../../../public/protocolLogo.svg';
import { UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
export default function Sidebar() {
  const pathname = usePathname();
  const [isGmailLoading, setIsGmailLoading] = useState(false);

  const navigationItems = [
    { icon: TerminalSquareIcon, label: 'Playground', href: '/playground' },
    { icon: LucideBrain, label: 'Memory', href: '/memory' },
    { 
      icon: isGmailLoading ? Loader2 : Mail, 
      label: 'Gmail', 
      href: null, 
      onClick: async () => {
        try {
          setIsGmailLoading(true);
          const response = await fetch("/api/gmail/auth");
          const { url } = await response.json();
          window.location.href = url;
        } catch (error) {
          console.error("Failed to get Gmail auth URL:", error);
          setIsGmailLoading(false);
        }
      } 
    },
    { icon: FileText, label: 'Docs', href: '/docs' },
  ];

  return (
    <div className="w-16 h-screen bg-black border-r border-zinc-800 flex flex-col items-center">
      <Link
        href="/"
        className="pt-4 pb-2"
        title="Home"
      >
        <Image 
          src={ProtocolLogo} 
          alt="Protocol Logo" 
          width={40} 
          height={40} 
          className="text-white hover:scale-110 transition-all duration-300"
        />
      </Link>

      <div className="flex flex-col items-center pt-4">
        {navigationItems.map((item, index) => (
          item.href ? (
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
          ) : (
            <button
              key={index}
              onClick={item.onClick}
              disabled={isGmailLoading}
              className="p-3 rounded-lg mb-2 transition-colors hover:bg-zinc-800 group text-zinc-400 hover:text-white cursor-pointer"
              title={item.label}
            >
              <item.icon className={`w-4 h-4 group-hover:text-white ${isGmailLoading ? 'animate-spin' : ''}`} />
            </button>
          )
        ))}
      </div>
      <div className="mt-auto mb-2.5">
      <UserButton
              afterSignOutUrl="/"
              appearance={{
                baseTheme: dark,
                elements: {
                  userButtonAvatarBox: "!rounded-lg !w-10 !h-10",
                  userButtonTrigger: "p-0.5 rounded-lg",
                  userButtonPopoverCard: "min-w-[240px] rounded-lg",
                },
              }}
            />
      </div>
    </div>
  );
}