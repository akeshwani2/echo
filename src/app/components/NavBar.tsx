"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { userId } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-items-start p-6 pb-8 gap-16 sm:p-6 sm:pb-2 tracking-tighter">
      <Link href="/">
      <h1 className="text-3xl flex items-center gap-2">
        {/* echo */}
        <Image
          src="/protocolLogo.svg"
          alt="Protocol Logo"
          width={50}
          height={50}
        />
      </h1>
      </Link>
      <div className="flex items-center justify-between w-full">
        <div></div>
        <div className="flex items-center justify-between gap-4">
        <button className={`relative hover:text-white/90 
            before:absolute before:bottom-0 before:left-0 before:h-[1px] before:bg-white
            before:transition-all before:duration-300 before:ease-out
            ${pathname === '/sign-up' 
              ? 'before:w-full' 
              : 'before:w-0 hover:before:w-full'
            }`}>
              {userId ? (
                <Link href="/playground">welcome{" "}{user?.firstName?.toLowerCase()}</Link>
              ) : (
                <Link href="/sign-up">sign up</Link>
              )}
          </button>
          <button className={`relative hover:text-white/90 
            before:absolute before:bottom-0 before:left-0 before:h-[1px] before:bg-white
            before:transition-all before:duration-300 before:ease-out
            ${pathname === '/playground' 
              ? 'before:w-full' 
              : 'before:w-0 hover:before:w-full'
            }`}>
            {userId ? (
              <Link href="/playground">playground</Link>
            ) : (
              <Link href="/sign-up">playground</Link>
            )}
          </button>



          <button className={`relative hover:text-white/90
            before:absolute before:bottom-0 before:left-0 before:h-[1px] before:bg-white
            before:transition-all before:duration-300 before:ease-out
            ${pathname === '/docs' 
              ? 'before:w-full' 
              : 'before:w-0 hover:before:w-full'
            }`}>
            <Link href="/docs">docs</Link>
          </button>
        </div>
      </div>
    </div>
  );
}
