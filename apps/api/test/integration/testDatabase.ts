// Starts a throwaway MongoDB for integration tests (issue #33).
//
// The database runs locally via mongodb-memory-server, is named eisai_test,
// and is deleted when the run ends. It never reads the Atlas URI from .env:
// MONGODB_URI is overwritten before the app's config loads, and the connection
// is checked again after connecting. Import this BEFORE anything from src/.
import { MongoMemoryServer } from 'mongodb-memory-server';

export const TEST_DB_NAME = 'eisai_test';

// MongoDB 8.x macOS builds need macOS 14+, so default to 7.0 to keep the suite
// runnable on older Macs. The queries and indexes tested here behave the same
// on 7.0 and 8.0. Override with MONGOMS_VERSION=8.0.15 to match Atlas exactly.
const MONGODB_VERSION = process.env.MONGOMS_VERSION ?? '7.0.14';

const server = await MongoMemoryServer.create({
  binary: { version: MONGODB_VERSION },
  instance: { dbName: TEST_DB_NAME, ip: '127.0.0.1' },
});
const uri = server.getUri(TEST_DB_NAME);

// dotenv never overrides a variable that is already set, so .env is ignored.
process.env.MONGODB_URI = uri;

const { env } = await import('../../src/config/env.js');
const { connectDatabase, disconnectDatabase } = await import('../../src/config/db.js');
const { default: mongoose } = await import('mongoose');

if (env.mongodbUri !== uri) {
  throw new Error('Refusing to run: the API is not configured for the local test database.');
}

await connectDatabase();

const { host, name } = mongoose.connection;
if (host !== '127.0.0.1' || name !== TEST_DB_NAME) {
  await disconnectDatabase();
  await server.stop();
  throw new Error(`Refusing to run against ${host}/${name}; expected 127.0.0.1/${TEST_DB_NAME}.`);
}

// Build the real indexes (e.g. unique email) so tests exercise them.
await mongoose.connection.syncIndexes();

/** Empties every collection so each test starts from a clean database. */
export async function clearDatabase() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** Disconnects and deletes the test database. Call once in `after()`. */
export async function stopTestDatabase() {
  await disconnectDatabase();
  await server.stop();
}
