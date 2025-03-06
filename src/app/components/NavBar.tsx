import Link from "next/link";

export default function NavBar() {
  return (
    <div className="flex items-center justify-items-start p-6 pb-20 gap-16 sm:p-10 tracking-tighter">
      <h1 className="text-3xl">echo</h1>
      <div className="flex items-center justify-between w-full">
        <nav className="flex items-center justify-between gap-4">
          <button className="hover:border-b-1">
            <Link href="/pricing">pricing</Link>
          </button>
          <button className="hover:border-b-1">
            <Link href="/pricing">docs</Link>
          </button>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <button className="hover:border-b-1">
            <Link href="/sign-up">sign up</Link>
          </button>
          <button className="hover:border-b-1">
            <Link href="/dashboard">dashboard</Link>
          </button>
        </div>
      </div>
    </div>
  );
}

