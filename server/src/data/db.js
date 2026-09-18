import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME || 'secondary_sms');
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not connected yet - call connectDb() first');
  return db;
}
