import mongoose from 'mongoose';
import { requireDatabaseUri } from './env.js';

export async function connectDatabase() {
  await mongoose.connect(requireDatabaseUri(), {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}
