#!/usr/bin/env node
// Usage: node scripts/reset-password.mjs <email> <new-password>
// Or:    node scripts/reset-password.mjs --create <email> <password>
// Resets or creates an admin account in the selfhosted database.
import pg from "pg";
import bcrypt from "bcrypt";
import readline from "readline";

const { Pool } = pg;

const connectionString = process.env.SELFHOSTED_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: SELFHOSTED_DATABASE_URL or DATABASE_URL must be set.");
  console.error("Example: DATABASE_URL=postgresql://... node scripts/reset-password.mjs admin@example.com newpassword123");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const createMode = args[0] === "--create";
  const emailArg = createMode ? args[1] : args[0];
  const passArg = createMode ? args[2] : args[1];

  const email = emailArg || await ask("Email: ");
  const password = passArg || await ask("New password: ");

  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    if (createMode) {
      const res = await client.query(
        `INSERT INTO sh_users (email, password_hash, role, two_fa_enabled, is_blocked)
         VALUES ($1, $2, 'admin', false, false)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'admin', is_blocked = false
         RETURNING id, email, role`,
        [email, hash]
      );
      const user = res.rows[0];
      console.log(`\n✅ Admin account created/updated:`);
      console.log(`   ID: ${user.id}  Email: ${user.email}  Role: ${user.role}`);
    } else {
      const check = await client.query("SELECT id, email, role FROM sh_users WHERE email = $1", [email]);
      if (check.rows.length === 0) {
        console.error(`\n❌ User "${email}" not found.`);
        console.error(`   Use --create flag to create a new account:`);
        console.error(`   node scripts/reset-password.mjs --create ${email} ${password}`);
        process.exit(1);
      }
      await client.query("UPDATE sh_users SET password_hash = $1 WHERE email = $2", [hash, email]);
      console.log(`\n✅ Password reset for ${email} (role: ${check.rows[0].role})`);
    }
    console.log("   You can now log in with the new password.\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
