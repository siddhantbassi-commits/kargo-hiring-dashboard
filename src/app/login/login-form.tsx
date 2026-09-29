"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent-2 focus:ring-2 focus:ring-accent-2/15"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent-2 focus:ring-2 focus:ring-accent-2/15"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground shadow-[var(--shadow-sm)] transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
