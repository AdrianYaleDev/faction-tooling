// src/lib/definitions.ts

export interface User {
  id: string;
  name: string;
  torn_id: number;
  faction_id: number | null;
  api_key: string; 
  created_at: Date;
}

export interface Faction {
	id: string;
	name: string;
	faction_id: number;
}

export interface DashboardUser {
  userName: string;
  tornId: number;
  factionId: number | null;
  factionName: string | null;
  factionTag: string | null;
  leaderId: number | null;
}

export interface ArmoryLog {
  id: string;
  tornId: number;
  userName: string | null;
  actionType: string | null;
  itemName: string | null;
  quantity: number;
  rawText: string;
  logTimestamp: number;
}

export interface NormalizedArmoryLog extends ArmoryLog {
  resolvedUserName: string;
  resolvedAction: string;
  resolvedItemName: string;
  category: string;
  direction: 'in' | 'out' | 'unknown';
}

export interface ArmoryUserTotals {
  userName: string;
  tornId: number;
  inQuantity: number;
  outQuantity: number;
  netQuantity: number;
}

export interface ArmoryItemSummary {
  itemName: string;
  category: string;
  inQuantity: number;
  outQuantity: number;
  netQuantity: number;
  users: ArmoryUserTotals[];
}

export interface ArmoryUserSummary {
  userName: string;
  tornId: number;
  inQuantity: number;
  outQuantity: number;
  netQuantity: number;
  itemCount: number;
  items: Array<{
    itemName: string;
    category: string;
    inQuantity: number;
    outQuantity: number;
    netQuantity: number;
  }>;
}