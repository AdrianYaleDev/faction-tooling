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

async function dropFactionTable() {
  try {
    await sql`DROP TABLE IF EXISTS factions CASCADE;`;
    console.log('Dropped "factions" table');
  } catch (error) {
    console.error('Error dropping factions table:', error);
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
				api_key TEXT NULL,
				last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			);
		`;
		console.log(`Created "Faction" Table`);
	} catch (error) {
		console.error('Error making Faction Table:', error);
		throw error;
  	}
}

async function createArmoryLogTable() {
	try {
		await sql `
			CREATE TABLE IF NOT EXISTS armory_logs (
				id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
				faction_id INT NOT NULL,
				torn_id INT NOT NULL,
				action_type VARCHAR(50),
				item_name VARCHAR(255),
				quantity INT DEFAULT 0,
				raw_text TEXT not null,
				log_timestamp INT NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(faction_id, log_timestamp, raw_text)
			);	
		`;

	} catch (error) {
		console.error("Error createing Logs Table:" , error);
		throw error;
	}
}

async function createItemsMarketTable() {
	try {
		await sql`
			CREATE TABLE IF NOT EXISTS items_market (
				item_id INT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT,
				type VARCHAR(100),
				market_value BIGINT NOT NULL DEFAULT 0,
				buy_price BIGINT NOT NULL DEFAULT 0,
				sell_price BIGINT NOT NULL DEFAULT 0,
				last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			);
		`;
		console.log(`Created "items_market" Table`);
	} catch (error) {
		console.error("Error creating Items Market Table:", error);
		throw error;
	}
}

async function main() {
  console.log('--- Starting Database Setup ---');
//   await dropUserTable();
  await createUserTable();
//   await dropFactionTable();
  await createFactionTable();
  await createArmoryLogTable();
  await createItemsMarketTable();
  // You can add seedPosts(), seedProducts(), etc., here later
  console.log('--- Database Setup Complete ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('An error occurred while attempting to seed the database:', err);
  process.exit(1);
});