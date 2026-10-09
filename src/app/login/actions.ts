"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const callbackUrl = formData.get("callbackUrl");
  const redirectTo = safeRedirectPath(typeof callbackUrl === "string" ? callbackUrl : null) ?? "/";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // NEXT_REDIRECT is thrown by a successful signIn — let the framework handle it.
    throw error;
  }
}
