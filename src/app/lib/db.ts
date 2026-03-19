// src/lib/db.ts
import * as dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// This prevents multiple connections during development hot-reloads
const globalForDb = global as unknown as { conn: ReturnType<typeof postgres> | undefined };

export const sql = globalForDb.conn ?? postgres(connectionString, { 
  ssl: 'require' // Aiven requires SSL
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = sql;