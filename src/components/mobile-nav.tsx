"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMenu, IconClose } from "./icons";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/candidates/new", label: "Add Candidate" },
  { href: "/rubric", label: "Rubric" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu on navigation without an Effect: adjust state during
  // render when the route changes, per React's "you might not need an
  // Effect" guidance (avoids an extra render pass from setState-in-effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-neutral-bg hover:text-foreground"
      >
        {open ? <IconClose /> : <IconMenu />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-border bg-surface px-4 py-3 shadow-[var(--shadow-md)]">
          <nav className="flex flex-col gap-1 text-sm">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-2.5 transition-colors ${
                    active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-neutral-bg hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <form action={onSignOut} className="mt-1 border-t border-border pt-2">
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2.5 text-left text-muted transition-colors hover:bg-neutral-bg hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
