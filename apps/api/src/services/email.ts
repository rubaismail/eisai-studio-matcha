import { MailtrapClient } from "mailtrap";
import { env, requireAppUrl } from "../config/env.js";

const mailtrap = new MailtrapClient({
  token: env.mailtrapToken,
  sandbox: env.mailtrapUseSandbox,
  testInboxId: Number(env.mailtrapInboxId), // required for sandbox
});

export async function sendVerificationEmail(recipient: string, rawToken: string) {
  const base = requireAppUrl();
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;

  await mailtrap.send({
    from: { name: "Your App", email: env.emailFrom },
    to: [{ email: recipient }],
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