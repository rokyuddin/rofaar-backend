import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env.js';
import * as schema from '@/db/index.js';

const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle({ client: queryClient, schema });

export type DB = typeof db;
