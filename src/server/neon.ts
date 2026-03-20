import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in environment variables.");
}

export const sql = neon(databaseUrl);

export async function checkNeonConnection() {
  const result = await sql`SELECT NOW() AS now`;
  return result[0]?.now;
}
