import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL. Add it to your .env file.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const result = await sql`SELECT NOW() AS now`;

console.log("Neon connection successful.");
console.log(`Database time: ${result[0].now}`);
