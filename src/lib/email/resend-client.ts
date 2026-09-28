import { Resend } from "resend";

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailConfigError(
      "RESEND_API_KEY is not configured. Set it in your environment to enable sending email."
    );
  }
  return new Resend(apiKey);
}

export function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new EmailConfigError(
      "RESEND_FROM_EMAIL is not configured. Set it to a verified Resend sender address to enable sending email."
    );
  }
  return from;
}
