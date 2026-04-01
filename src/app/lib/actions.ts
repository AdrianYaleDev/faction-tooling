'use server'

import { sql } from './db';
import { revalidatePath } from 'next/cache';
import { DashboardUser, User } from './definitions';
import { encrypt, decrypt } from './crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseArmoryLog } from './parser';


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

export async function syncArmoryLogs() {
  const user = await sql`SELECT api_key, faction_id FROM users WHERE torn_id = 2978935 LIMIT 1`;
  if (!user.length || !user[0].faction_id) return { error: "No faction config found" };

  const apiKey = decrypt(user[0].api_key);
  const factionId = user[0].faction_id;

  const res = await fetch(`https://api.torn.com/faction/?selections=armorynews&key=${apiKey}`);
  const data = await res.json();

  if (data.error || !data.armorynews) {
    console.error("Torn API Error:", data.error);
    return;
  }

  const logs = Object.values(data.armorynews);

  for (const logEntry of logs as any[]) {
    const { tornId, action, item, plainText } = parseArmoryLog(logEntry.news);

    if (tornId === 0) continue; // Skip logs we can't identify

    await sql`
      INSERT INTO armory_logs (
        faction_id, 
        torn_id, 
        action_type, 
        item_name, 
        raw_text, 
        log_timestamp
      )
      VALUES (
        ${factionId}, 
        ${tornId}, 
        ${action}, 
        ${item}, 
        ${plainText}, 
        ${logEntry.timestamp}
      )
      ON CONFLICT (faction_id, log_timestamp, raw_text) DO NOTHING
    `;
  }
}

export async function syncAllFactionLogs() {
  // 1. Get all factions that have a system key
  const factions = await sql`SELECT faction_id, api_key FROM factions WHERE api_key IS NOT NULL`;

  for (const faction of factions) {
    try {
      const decryptedKey = decrypt(faction.api_key);
      
      const res = await fetch(
        `https://api.torn.com/faction/?selections=armorynews&key=${decryptedKey}`,
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (data.armorynews) {
        const logs = Object.values(data.armorynews);
        for (const logEntry of logs as any[]) {
          const { tornId, action, item, quantity, plainText } = parseArmoryLog(logEntry.news);
          
          await sql`
            INSERT INTO armory_logs (faction_id, torn_id, action_type, item_name, quantity, raw_text, log_timestamp)
            VALUES (${faction.faction_id}, ${tornId}, ${action}, ${item}, ${quantity}, ${plainText}, ${logEntry.timestamp})
            ON CONFLICT (faction_id, log_timestamp, raw_text) DO NOTHING
          `;
        }
        console.log(`Synced logs for Faction ${faction.faction_id}`);
      }
    } catch (err) {
      console.error(`Failed to sync faction ${faction.faction_id}:`, err);
    }
  }
}

export async function updateFactionApiKeyAction(prevState: any, formData: FormData) {
  const factionId = formData.get('factionId') as string;
  const newKey = formData.get('apiKey') as string;

  console.log(newKey);

  if (!factionId || !newKey) {
    return { error: "Missing required fields." };
  }

  try {
    // Verify key with Torn before saving
    const check = await fetch(`https://api.torn.com/faction/?selections=attacks&key=${newKey}`, {
      cache: 'no-store',
    });
    
    const data = await check.json();
	console.log(data);
    
    // Check if response indicates an error
    if (!check.ok || data.error) {
      console.error("Torn API Error:", data);
      return { error: "Invalid Torn API Key." };
    }

    const encryptedKey = encrypt(newKey);

    await sql`
      UPDATE factions 
      SET api_key = ${encryptedKey} 
      WHERE faction_id = ${parseInt(factionId)}
    `;
    
    return { success: "System key updated successfully!" };
  } catch (err) {
    console.error("updateFactionApiKeyAction Error:", err);
    return { error: "Database error occurred." };
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
		const encryptedKey = encrypt(apiKey);
      await sql`
        INSERT INTO factions (faction_id, name, tag, leader_id, co_leader_id, api_key, last_updated)
        VALUES (
          ${actualFactionId}, 
          ${f.name ?? 'Unknown'}, 
          ${f.tag ?? null}, 
          ${f.leader_id ?? 0}, 
          ${f.co_leader_id ?? null}, 
		  ${encryptedKey},
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

export async function getDashboardData(tornId: string): Promise<DashboardUser | null> {
  try {
    const data = await sql<DashboardUser[]>`
      SELECT 
        u.name as "userName",
        u.faction_id as "factionId",
        f.name as "factionName",
        f.tag as "factionTag",
        f.leader_id as "leaderId"
      FROM users u
      LEFT JOIN factions f ON u.faction_id = f.faction_id
      WHERE u.torn_id = ${parseInt(tornId)}
      LIMIT 1
    `;
    return data[0];
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    return null;
  }
}