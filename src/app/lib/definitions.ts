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