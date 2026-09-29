import { LogoMark } from "@/components/logo-mark";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow-lg)]">
        <LogoMark className="h-9 w-9" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">Kargo Hiring</h1>
        <p className="mt-1 text-sm text-muted">Internal access only.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
