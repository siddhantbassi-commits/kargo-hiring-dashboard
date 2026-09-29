import Link from "next/link";
import { signOut } from "@/auth";
import { LogoMark } from "./logo-mark";
import { NavLink } from "./nav-link";

export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Kargo <span className="font-normal text-muted">Hiring</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/candidates/new">Add Candidate</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </nav>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-neutral-bg hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
