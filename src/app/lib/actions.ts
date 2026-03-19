'use server'

import { sql } from './db';
import { revalidatePath } from 'next/cache';
import { User } from './definitions';

// Example: Fetching data
export async function getUsers() {
  try {
    // We map snake_case DB columns to camelCase if you prefer that in TS
    const users = await sql<User[]>`
      SELECT 
        id, 
        name, 
        faction_id as "factionId", 
        torn_id as "tornId"
      FROM users 
      ORDER BY created_at DESC
    `;
    return users;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch users.");
  }
}

// Example: Inserting data
export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  try {
    await sql`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
    `;
    
    // This tells Next.js to clear the cache and show the new data
    revalidatePath('/users'); 
  } catch (error) {
    return { message: "Database Error: Failed to Create User." };
  }
}