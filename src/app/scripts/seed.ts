// scripts/seed.ts
import { sql } from '../lib/db';
import { User } from '../lib/definitions';

async function seedUsers() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
		factionID VARCHAR(255) NULL,
		tornID INT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log(`Created "users" table`);

    // 3. Optional: Insert a mock user to test the connection
    const mockUser = {
      name: 'Aiven Explorer',
      factionID: null,
      tornID: 123456,
    };

    const insertedUser = await sql<User[]>`
      INSERT INTO users (name, factionID, tornID)
      VALUES (${mockUser.name}, ${mockUser.factionID}, ${mockUser.tornID})
      ON CONFLICT (tornID) DO NOTHING
      RETURNING *;
    `;

    console.log(`Seeded ${insertedUser.length} user(s)`);
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function main() {
  console.log('--- Starting Database Setup ---');
  await seedUsers();
  // You can add seedPosts(), seedProducts(), etc., here later
  console.log('--- Database Setup Complete ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
  process.exit(1);
});