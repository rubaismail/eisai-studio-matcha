import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import { requireAppUrl, requireMailConfig } from "../config/env.js";

const mail = requireMailConfig();

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: mail.token,
    sandbox: mail.sandbox,
    ...(mail.sandbox ? { testInboxId: mail.inboxId } : {}),
  })
);

// Pure: builds the absolute verify URL from a base and raw token.
export function buildVerificationLink(baseUrl: string, rawToken: string): string {
  const link = new URL("/api/auth/verify", baseUrl);
  link.searchParams.set("token", rawToken);
  return link.toString();
}

export async function sendVerificationEmail(recipient: string, rawToken: string): Promise<void> {
  const link = buildVerificationLink(requireAppUrl(), rawToken);

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