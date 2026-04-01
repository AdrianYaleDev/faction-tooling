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