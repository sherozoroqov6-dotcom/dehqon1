import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { logger } from "../../api-server/src/lib/logger";

const { Pool } = pg;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: pg.Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // DATABASE_URL not set — bot works without database (no user/analysis storage)
  console.warn("[db] DATABASE_URL not set — running without database");
}

export { db, pool };
export * from "./schema";
