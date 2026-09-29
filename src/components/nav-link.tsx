"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-neutral-bg hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
