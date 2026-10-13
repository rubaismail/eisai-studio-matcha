import './env.js';
import { readConfig, assertSeedAllowed } from './config.js';
import { connectDatabase } from './database.js';
import { sampleMenu } from './menu.js';
try {
  const config = readConfig(process.env);
  assertSeedAllowed(config);
  const { client, db } = await connectDatabase(config);
  try {
    const collection = db.collection('menuItems');
    await collection.createIndex({ slug: 1 }, { unique: true });
    for (const item of sampleMenu) {
      await collection.updateOne(
        { slug: item.slug },
        { $setOnInsert: item },
        { upsert: true },
      );
    }
    console.log(
      `Seeded ${sampleMenu.length} sample menu entries in ${config.MONGODB_DB}. Existing entries were preserved.`,
    );
  } finally {
    await client.close();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
}
