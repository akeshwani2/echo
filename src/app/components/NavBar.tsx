"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { userId } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-items-start p-6 pb-20 gap-16 sm:p-10 tracking-tighter">
      <h1 className="text-3xl flex items-center gap-2">
        echo
        <Image
          src="/protocolLogo.svg"
          alt="Protocol Logo"
          width={50}
          height={50}
        />
      </h1>
      <div className="flex items-center justify-between w-full">
        <div></div>
        <div className="flex items-center justify-between gap-4">
          <button className={`hover:border-b transition-all ${pathname === '/docs' ? 'border-b' : ''}`}>
            <Link href="/docs">docs</Link>
          </button>
          <button className={`hover:border-b transition-all ${pathname === '/sign-up' ? 'border-b' : ''}`}>
            <Link href="/sign-up">sign up</Link>
          </button>
          <button className={`hover:border-b transition-all ${pathname === '/playground' ? 'border-b' : ''}`}>
            {userId ? (
              <Link href="/playground">playground</Link>
            ) : (
              <Link href="/sign-up">playground</Link>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
