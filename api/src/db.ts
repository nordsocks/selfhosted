import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pgTable, serial, varchar, boolean, integer, timestamp, text } from "drizzle-orm/pg-core";

const { Pool } = pg;

const connectionString = process.env.SELFHOSTED_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("SELFHOSTED_DATABASE_URL or DATABASE_URL must be set.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);

export const shUsersTable = pgTable("sh_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
  twoFaSecret: varchar("two_fa_secret", { length: 255 }),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shProxiesTable = pgTable("sh_proxies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 10 }).notNull(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }),
  externalPort: integer("external_port").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("starting"),
  containerId: varchar("container_id", { length: 100 }),
  publicIp: varchar("public_ip", { length: 100 }),
  nordUserEncrypted: text("nord_user_encrypted").notNull(),
  nordPassEncrypted: text("nord_pass_encrypted").notNull(),
  allowedIps: text("allowed_ips"),
  rotationInterval: integer("rotation_interval").notNull().default(0),
  rotationNextAt: timestamp("rotation_next_at"),
  lastCountryChangeAt: timestamp("last_country_change_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sh_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        two_fa_secret VARCHAR(255),
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sh_proxies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES sh_users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(10) NOT NULL,
        country_name VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        external_port INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'starting',
        container_id VARCHAR(100),
        public_ip VARCHAR(100),
        nord_user_encrypted TEXT NOT NULL,
        nord_pass_encrypted TEXT NOT NULL,
        allowed_ips TEXT,
        rotation_interval INTEGER NOT NULL DEFAULT 0,
        rotation_next_at TIMESTAMP,
        last_country_change_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      ALTER TABLE sh_proxies ADD COLUMN IF NOT EXISTS allowed_ips TEXT;
    `);
  } finally {
    client.release();
  }
}
