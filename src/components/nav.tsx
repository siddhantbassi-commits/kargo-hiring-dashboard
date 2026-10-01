import Link from "next/link";
import { signOut } from "@/auth";
import { LogoMark } from "./logo-mark";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";

export function Nav() {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Kargo <span className="font-normal text-muted">Hiring</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/candidates/new">Add Candidate</NavLink>
            <NavLink href="/rubric">Rubric</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </nav>
        </div>
        <form action={handleSignOut} className="hidden sm:block">
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-neutral-bg hover:text-foreground"
          >
            Sign out
          </button>
        </form>
        <MobileNav onSignOut={handleSignOut} />
      </div>
    </header>
  );
}
