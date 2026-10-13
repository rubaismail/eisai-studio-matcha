import { MongoClient } from 'mongodb';
import type { Config } from './config.js';
export async function connectDatabase(config: Config) {
  const client = new MongoClient(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(config.MONGODB_DB);
    await db.command({ ping: 1 });
    return { client, db };
  } catch {
    await client.close();
    throw new Error(
      'MongoDB connection failed. Start local services or check the Atlas connection and network access.',
    );
  }
}
