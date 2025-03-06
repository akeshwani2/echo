import Link from "next/link";
import Image from "next/image";
export default function NavBar() {
  return (
    <div className="flex items-center justify-items-start p-6 pb-20 gap-16 sm:p-10 tracking-tighter">
      <h1 className="text-3xl flex items-center gap-2">
        echo
        <Image src="/protocolLogo.svg" alt="Protocol Logo" width={50} height={50} />

      </h1>
      <div className="flex items-center justify-between w-full">
<div></div>
        <div className="flex items-center justify-between gap-4">
        <button className="hover:border-b-1">
            <Link href="/pricing">docs</Link>
          </button>
          <button className="hover:border-b-1">
            <Link href="/sign-up">sign up</Link>
          </button>
          <button className="hover:border-b-1">
            <Link href="/playground">playground</Link>
          </button>
        </div>
      </div>
    </div>
  );
}

