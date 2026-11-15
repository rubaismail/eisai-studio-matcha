// npm run demo:api — a throwaway API for the Postman class demo.
//
// Starts the real Express app on http://localhost:4000 against an in-memory
// MongoDB (never Atlas or production), adds a few sample drinks plus a verified
// admin and customer, and prints a login token for each. Paste the admin token
// into Postman's `adminToken` collection variable. Everything is deleted when
// you stop it with Ctrl+C. See docs/postman-demo.md.
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = Number(process.env.DEMO_PORT ?? 4000);
// Long enough to rehearse and present without restarting.
const TOKEN_LIFETIME = '6h';

const mongo = await MongoMemoryServer.create({
  // Same version as the integration tests; runs on older Macs.
  binary: { version: process.env.MONGOMS_VERSION ?? '7.0.14' },
  instance: { dbName: 'eisai_demo', ip: '127.0.0.1' },
});
const uri = mongo.getUri('eisai_demo');

// dotenv never overrides variables that are already set, so .env is ignored here.
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'development';

const { env } = await import('../../src/config/env.js');
if (env.mongodbUri !== uri) {
  throw new Error('Refusing to start: the API is not pointed at the in-memory demo database.');
}
const { connectDatabase, disconnectDatabase } = await import('../../src/config/db.js');
const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const { MenuItem } = await import('../../src/models/MenuItem.js');
const { hashPassword } = await import('../../src/config/password.js');

await connectDatabase();

await MenuItem.create([
  { name: 'Iced Matcha Latte', price: 6, teaBases: ['matcha'], isRecommended: true },
  { name: 'Iced Hojicha Latte', price: 6, teaBases: ['hojicha'] },
  { name: 'Golden Hour', price: 7, teaBases: ['matcha', 'hojicha'], isFeatured: true },
]);

// Nobody logs in with these passwords; the tokens below are signed directly.
const passwordHash = await hashPassword(randomBytes(24).toString('base64url'));
const admin = await User.create({
  firstName: 'Demo',
  lastName: 'Admin',
  email: 'admin@demo.test',
  passwordHash,
  role: 'admin',
  isVerified: true,
});
const customer = await User.create({
  firstName: 'Demo',
  lastName: 'Customer',
  email: 'customer@demo.test',
  passwordHash,
  role: 'customer',
  isVerified: true,
});

// Same claims and algorithm as POST /api/auth/login (login.controller.ts).
const sign = (id: string) =>
  jwt.sign({}, process.env.JWT_SECRET as string, {
    subject: id,
    expiresIn: TOKEN_LIFETIME,
    algorithm: 'HS256',
  });

const server = createApp().listen(PORT, '127.0.0.1', () => {
  console.log(`
Demo API running at http://localhost:${PORT}/api (in-memory database, 3 sample drinks)

Postman: set the collection variable  adminToken  to:

${sign(admin.id)}

Optional, to show 403 Forbidden, a customer token:

${sign(customer.id)}

Tokens last ${TOKEN_LIFETIME}. Press Ctrl+C to stop; all demo data is deleted.
`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${PORT} is busy. Stop "npm run dev" first, or run with DEMO_PORT=4001 and change baseUrl in Postman.`
      : error,
  );
  void shutdown(1);
});

async function shutdown(code = 0) {
  server.close();
  await disconnectDatabase().catch(() => {});
  await mongo.stop();
  process.exit(code);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
