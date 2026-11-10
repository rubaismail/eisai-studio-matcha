import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import { requireEmailConfig, requireWebOrigin } from "../config/env.js";

let cached: { transport: ReturnType<typeof nodemailer.createTransport>; mail: ReturnType<typeof requireEmailConfig> } | null = null;

function getTransport() {
  if (cached) return cached;
  const mail = requireEmailConfig();
  const transport = nodemailer.createTransport(
    MailtrapTransport({
      token: mail.token,
      sandbox: mail.sandbox,
      ...(mail.sandbox ? { testInboxId: mail.inboxId } : {}),
    }),
  );
  cached = { transport, mail };
  return cached;
}
// Pure: builds the absolute verify URL from the website origin and raw token.
// The website's /verify-email page reads the token and calls GET /api/auth/verify.
export function buildVerificationLink(baseUrl: string, rawToken: string): string {
  const link = new URL("/verify-email", baseUrl);
  link.searchParams.set("token", rawToken);
  return link.toString();
}
export function buildResetLink(baseUrl: string, rawToken: string): string {
  const link = new URL("/reset-password", baseUrl);
  link.searchParams.set("token", rawToken);
  return link.toString();
}

export async function sendVerificationEmail(recipient: string, rawToken: string): Promise<void> {
  const origin = requireWebOrigin();
  const { transport, mail } = getTransport();
  const link = buildVerificationLink(origin, rawToken);

  await transport.sendMail({
    from: mail.from,
    to: recipient,
    subject: "Verification Email",
    text: `Verify your email address

Thanks for signing up. Click the link below to verify your account:

${link}

This link expires in 15 minutes and can only be used once.
If you didn't create an account, you can ignore this email.`,
    html: `<p>Thanks for signing up. Click the link below to verify your account:</p>
<p><a href="${link}">${link}</a></p>
<p>This link expires in 15 minutes and can only be used once.<br>
If you didn't create an account, you can ignore this email.</p>`,
  });
}

export async function sendResetPasswordEmail(recipient: string, rawToken: string): Promise<void> {
  const origin = requireWebOrigin();
  const { transport, mail } = getTransport();
  const link = buildResetLink(origin, rawToken);

  await transport.sendMail({
    from: mail.from,
    to: recipient,
    subject: "Reset Password Email",
    text: `Reset your password

Click the link below to reset the password on your account:

${link}

This link expires in 15 minutes and can only be used once.
If you didn't create an account, you can ignore this email.`,
    html: `<p>Click the link below to reset the password on your account::</p>
<p><a href="${link}">${link}</a></p>
<p>This link expires in 15 minutes and can only be used once.<br>
If you didn't create an account, you can ignore this email.</p>`,
  });
}
