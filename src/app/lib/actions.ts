'use server'

import { sql } from './db';
import { revalidatePath } from 'next/cache';
import { User } from './definitions';
import { encrypt } from './crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

export async function loginWithTorn(formData: FormData) {
  const apiKey = formData.get('apiKey') as string;

  // 1. Fetch User Data
  const userRes = await fetch(`https://api.torn.com/v2/user/?selections=profile&key=${apiKey}`, { cache: 'no-store' });
  const userData = await userRes.json();

  if (userData.error) throw new Error(userData.error.error || "Invalid API Key");

  const profile = userData.profile;
  const tornId = profile?.id ?? null;
  const name = profile?.name ?? 'Unknown';
  
  // Ensure we get a number or null, never undefined
  const factionId = (profile?.faction_id !== 0) 
    ? Number(profile.faction_id) 
    : null;

  // 2. Handle Faction Sync
  if (factionId) {
    const facRes = await fetch(`https://api.torn.com/v2/faction/?selections=basic&key=${apiKey}`, { cache: 'no-store' });
    const facData = await facRes.json();

    if (!facData.error && facData.basic) {
      const f = facData.basic;
      // Use logical OR to check for ID or faction_id
      const actualFactionId = f.ID ?? f.id ?? factionId;

      await sql`
        INSERT INTO factions (faction_id, name, tag, leader_id, co_leader_id, last_updated)
        VALUES (
          ${actualFactionId}, 
          ${f.name ?? 'Unknown'}, 
          ${f.tag ?? null}, 
          ${f.leader_id ?? 0}, 
          ${f.co_leader_id ?? null}, 
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (faction_id) DO UPDATE SET
          name = EXCLUDED.name,
          tag = EXCLUDED.tag,
          leader_id = EXCLUDED.leader_id,
          co_leader_id = EXCLUDED.co_leader_id,
          last_updated = CURRENT_TIMESTAMP
      `;
    }
  }

  // 3. Upsert User
  try {
    const encryptedKey = encrypt(apiKey);
    
    // Safety check: if tornId is somehow still null here, the query WILL fail
    if (!tornId) throw new Error("Could not retrieve Torn ID");

    await sql`
      INSERT INTO users (name, torn_id, faction_id, api_key)
      VALUES (
        ${name}, 
        ${tornId}, 
        ${factionId}, 
        ${encryptedKey}
      )
      ON CONFLICT (torn_id) DO UPDATE SET
        name = EXCLUDED.name,
        faction_id = EXCLUDED.faction_id,
        api_key = EXCLUDED.api_key
    `;

    const cookieStore = await cookies();
    cookieStore.set('session_user_id', tornId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  } catch (err) {
    console.error("DB Error Detail:", err);
    throw new Error("Database sync failed");
  }

  redirect('/dashboard');
}