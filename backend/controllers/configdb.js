
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();
let db;
let mongoClient;

const mongoUri = process.env.MONGOURI;
const dbName = process.env.DBNAME;

if (!mongoUri) {
  console.error('FATAL ERROR: Environment variable MONGOURI not defined.');
  process.exit(1);
}
if (!dbName) {
  console.error('FATAL ERROR: Environment variable MONGO_DBNAME not defined.');
  process.exit(1);
}

export async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    mongoClient = await client.connect();
    console.log('MongoDB client connected.');

    db = mongoClient.db(dbName);
    console.log(`Connected to database: ${dbName}`);

    mongoClient.on('connected', () => console.log('MongoDB Client: Connected'));
    mongoClient.on('error', (err) => console.error('MongoDB Client: Error', err));
    mongoClient.on('disconnected', () => console.log('MongoDB Client: Disconnected'));

    process.on('SIGINT', async () => {
      if (mongoClient) {
        console.log('Closing MongoDB client connection due to process termination...');
        await mongoClient.close();
        console.log('MongoDB client connection closed.');
      }
      process.exit(0);

    })
    return db;
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database has not been initialized. Ensure connectToDatabase is called at startup.');
  }
  return db;
}