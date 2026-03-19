// scripts/seed.ts
import { sql } from '../lib/db';
import { User } from '../lib/definitions';

async function dropUserTable() {
  try {
    await sql`DROP TABLE IF EXISTS users CASCADE;`;
    console.log('Dropped "users" table');
  } catch (error) {
    console.error('Error dropping users table:', error);
    throw error;
  }
}

async function createUserTable() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;


    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
		faction_id INT NULL,
		torn_id INT NOT NULL UNIQUE,
		api_key TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log(`Created "users" table`);

  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function createFactionTable() {
	try {
		await sql`
			CREATE TABLE IF NOT EXISTS factions (
				faction_id INT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				tag VARCHAR(10) NULL,
				leader_id INT NOT NULL,
				co_leader_id INT NULL,
				last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			);
		`;
		console.log(`Created "Faction" Table`);
	} catch (error) {
		console.error('Error making Faction Table:', error);
		throw error;
  	}
}

async function main() {
  console.log('--- Starting Database Setup ---');
  await dropUserTable();
  await createUserTable();
  await createFactionTable();
  // You can add seedPosts(), seedProducts(), etc., here later
  console.log('--- Database Setup Complete ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
  process.exit(1);
});