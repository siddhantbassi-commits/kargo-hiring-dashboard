import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <LogoMark className="h-9 w-9" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        This candidate or page doesn&rsquo;t exist — it may have been removed, or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
