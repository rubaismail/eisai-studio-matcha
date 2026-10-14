// npm run seed — adds sample drinks so the menu isn't empty while you develop.
// Safe to run more than once: items are matched by name and only created if missing.
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { MenuItem } from '../models/MenuItem.js';

const sampleItems = [
  {
    name: 'Sample Matcha Latte',
    description: 'Placeholder until the client sends the real menu.',
    price: 6,
  },
  {
    name: 'Sample Pumpkin Matcha',
    description: 'Placeholder seasonal drink.',
    price: 7,
    isSeasonal: true,
  },
];

if (env.isProduction) {
  console.error('Refusing to seed sample data in production.');
  process.exit(1);
}

await connectDatabase();
for (const item of sampleItems) {
  await MenuItem.updateOne(
    { name: item.name },
    { $setOnInsert: item },
    { upsert: true },
  );
}
console.log(`Seeded ${sampleItems.length} sample items.`);
await disconnectDatabase();
