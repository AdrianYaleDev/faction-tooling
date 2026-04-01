'use server'

import { sql } from './db';
import { revalidatePath } from 'next/cache';
import { ArmoryLog, DashboardUser, User } from './definitions';
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

// Temporary manual sync for the currently logged-in user's faction.
export async function runTempCurrentFactionArmorySyncAction(formData: FormData): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get('session_user_id');

    if (!sessionUser) {
      return;
    }

    const userRows = await sql<{ factionId: number | null }[]>`
      SELECT faction_id as "factionId"
      FROM users
      WHERE torn_id = ${parseInt(sessionUser.value)}
      LIMIT 1
    `;

    const factionId = userRows[0]?.factionId;

    if (!factionId) {
      return;
    }

    const factionRows = await sql<{ apiKey: string | null }[]>`
      SELECT api_key as "apiKey"
      FROM factions
      WHERE faction_id = ${factionId}
      LIMIT 1
    `;

    const encryptedApiKey = factionRows[0]?.apiKey;

    if (!encryptedApiKey) {
      return;
    }

    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;
    const defaultStartTimestamp = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60);
    const defaultEndTimestamp = Math.floor(Date.now() / 1000);

    const requestedFromTimestamp = startDate
      ? Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000)
      : defaultStartTimestamp;
    const initialToTimestamp = endDate
      ? Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000)
      : defaultEndTimestamp;

    if (!Number.isFinite(requestedFromTimestamp) || !Number.isFinite(initialToTimestamp) || requestedFromTimestamp > initialToTimestamp) {
      console.log(`[TempArmorySync] Abort reason=invalid-range from=${startDate} to=${endDate}`);
      return;
    }

    const latestLocalRows = await sql<{ logTimestamp: number }[]>`
      SELECT log_timestamp as "logTimestamp"
      FROM armory_logs
      WHERE faction_id = ${factionId}
      ORDER BY log_timestamp DESC
      LIMIT 1
    `;

    const latestLocalTimestamp = latestLocalRows[0]?.logTimestamp ?? null;
    const isInitialBackfill = latestLocalTimestamp === null;
    const fromTimestamp = isInitialBackfill
      ? requestedFromTimestamp
      : latestLocalTimestamp + 1;

    if (fromTimestamp > initialToTimestamp) {
      console.log(
        `[TempArmorySync] Skip reason=already-up-to-date latestLocal=${latestLocalTimestamp} to=${initialToTimestamp}`,
      );
      revalidatePath('/dashboard/armory');
      return;
    }

    const apiKey = decrypt(encryptedApiKey);
    console.log(
      `[TempArmorySync] Start faction=${factionId} user=${sessionUser.value} mode=${isInitialBackfill ? 'backfill' : 'incremental'} from=${fromTimestamp} to=${initialToTimestamp} latestLocal=${latestLocalTimestamp ?? 'none'}`,
    );

    let currentTo = initialToTimestamp;
    const maxPages = 25;
    let totalFetched = 0;
    let totalInserted = 0;
    let totalConflicts = 0;
    let totalSkippedUnparsed = 0;

    for (let page = 0; page < maxPages; page++) {
      const pageUrl = `https://api.torn.com/faction/${factionId}?selections=armorynews&from=${fromTimestamp}&to=${currentTo}&key=${apiKey}`;

      console.log(`[TempArmorySync] Fetch page=${page + 1} from=${fromTimestamp} to=${currentTo}`);

      const res = await fetch(pageUrl, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || data.error || !data.armorynews) {
        console.log(
          `[TempArmorySync] Stop page=${page + 1} reason=api-error status=${res.status} error=${JSON.stringify(data?.error ?? null)}`,
        );
        break;
      }

      const logs = Object.values(data.armorynews) as any[];
      totalFetched += logs.length;

      if (logs.length === 0) {
        console.log(`[TempArmorySync] Stop page=${page + 1} reason=no-results`);
        break;
      }

      let pageMaxTimestamp = 0;
      let pageMinTimestamp: number | null = null;
      let pageInserted = 0;
      let pageConflicts = 0;
      let pageSkippedUnparsed = 0;

      for (const logEntry of logs) {
        const { tornId, action, item, quantity, plainText } = parseArmoryLog(logEntry.news);

        if (tornId === 0) {
          pageSkippedUnparsed++;
          totalSkippedUnparsed++;
          continue;
        }

        const insertResult = await sql<{ id: string }[]>`
          INSERT INTO armory_logs (faction_id, torn_id, action_type, item_name, quantity, raw_text, log_timestamp)
          VALUES (${factionId}, ${tornId}, ${action}, ${item}, ${quantity ?? 0}, ${plainText}, ${logEntry.timestamp})
          ON CONFLICT (faction_id, log_timestamp, raw_text) DO NOTHING
          RETURNING id
        `;

        if (insertResult.length > 0) {
          pageInserted += insertResult.length;
          totalInserted += insertResult.length;
        } else {
          pageConflicts++;
          totalConflicts++;
        }

        if (typeof logEntry.timestamp === 'number' && logEntry.timestamp > pageMaxTimestamp) {
          pageMaxTimestamp = logEntry.timestamp;
        }

        if (typeof logEntry.timestamp === 'number') {
          if (pageMinTimestamp === null || logEntry.timestamp < pageMinTimestamp) {
            pageMinTimestamp = logEntry.timestamp;
          }
        }
      }

      console.log(
        `[TempArmorySync] Page=${page + 1} fetched=${logs.length} inserted=${pageInserted} conflicts=${pageConflicts} skippedUnparsed=${pageSkippedUnparsed} minTs=${pageMinTimestamp ?? 'n/a'} maxTs=${pageMaxTimestamp}`,
      );

      if (pageMinTimestamp === null || pageMinTimestamp <= fromTimestamp) {
        console.log(
          `[TempArmorySync] Stop page=${page + 1} reason=range-exhausted from=${fromTimestamp} minTs=${pageMinTimestamp}`,
        );
        break;
      }

      currentTo = pageMinTimestamp - 1;
    }

    console.log(
      `[TempArmorySync] Complete pages<=${maxPages} fetched=${totalFetched} inserted=${totalInserted} conflicts=${totalConflicts} skippedUnparsed=${totalSkippedUnparsed}`,
    );

    revalidatePath('/dashboard/armory');
    return;
  } catch (error) {
    console.error('Temporary armory sync failed:', error);
    return;
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

type ArmoryLogRange = {
  startDate?: string;
  endDate?: string;
};

export async function getCurrentFactionArmoryLogs(
  limit = 200,
  range?: ArmoryLogRange,
): Promise<ArmoryLog[]> {
  try {
    const cookieStore = await cookies();
    const sessionUser = cookieStore.get('session_user_id');

    if (!sessionUser) {
      return [];
    }

    const factionLookup = await sql<{ factionId: number | null }[]>`
      SELECT faction_id as "factionId"
      FROM users
      WHERE torn_id = ${parseInt(sessionUser.value)}
      LIMIT 1
    `;

    const factionId = factionLookup[0]?.factionId;

    if (!factionId) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(limit, 5000));

    const hasStart = Boolean(range?.startDate);
    const hasEnd = Boolean(range?.endDate);

    const startTimestamp = hasStart
      ? Math.floor(new Date(`${range!.startDate}T00:00:00Z`).getTime() / 1000)
      : null;
    const endTimestamp = hasEnd
      ? Math.floor(new Date(`${range!.endDate}T23:59:59Z`).getTime() / 1000)
      : null;

    if ((hasStart && !Number.isFinite(startTimestamp)) || (hasEnd && !Number.isFinite(endTimestamp))) {
      return [];
    }

    const logs = await sql<ArmoryLog[]>`
      SELECT
        al.id,
        al.torn_id as "tornId",
        u.name as "userName",
        al.action_type as "actionType",
        al.item_name as "itemName",
        al.quantity,
        al.raw_text as "rawText",
        al.log_timestamp as "logTimestamp"
      FROM armory_logs al
      LEFT JOIN users u ON u.torn_id = al.torn_id
      WHERE al.faction_id = ${factionId}
        AND (${startTimestamp}::int IS NULL OR al.log_timestamp >= ${startTimestamp}::int)
        AND (${endTimestamp}::int IS NULL OR al.log_timestamp <= ${endTimestamp}::int)
      ORDER BY al.log_timestamp DESC
      LIMIT ${safeLimit}
    `;

    return logs;
  } catch (error) {
    console.error('Armory Logs Fetch Error:', error);
    return [];
  }
}