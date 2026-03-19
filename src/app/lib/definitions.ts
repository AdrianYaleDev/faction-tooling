// src/lib/definitions.ts

export interface User {
  id: string;       // Usually a UUID in Postgres
  tornID: string,
  name: string,
  factionId: string,
  createdAt: string,
  apiKey: string
}