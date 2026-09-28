import Link from "next/link";
import { signOut } from "@/auth";

export function Nav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Kargo Hiring
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/candidates/new" className="hover:text-foreground">
              Add Candidate
            </Link>
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
          </nav>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
