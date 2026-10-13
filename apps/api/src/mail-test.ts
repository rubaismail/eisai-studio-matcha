import nodemailer from 'nodemailer';
// Intentionally hard-coded to the local capture inbox, never a real provider.
const transport = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 1025,
  secure: false,
});
try {
  await transport.sendMail({
    from: 'dev@example.test',
    to: 'teammate@example.test',
    subject: 'Eisai local email check',
    text: 'Local SMTP capture is working. This message was not sent to a real mailbox.',
  });
  console.log('Open http://localhost:8025 to view the captured test email.');
} catch {
  console.error('Local email check failed. Run npm run services:up.');
  process.exitCode = 1;
}
