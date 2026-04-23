#!/usr/bin/env node
// Запуск из папки /opt/nordsocks/api:
//   node scripts/reset-password.mjs                          — интерактивный режим
//   node scripts/reset-password.mjs belovaqliy@gmail.com     — спросит только пароль
//   node scripts/reset-password.mjs email@example.com pass   — без интерактива
import pg from "pg";
import bcrypt from "bcrypt";
import readline from "readline";
import fs from "fs";
import path from "path";

// Загружаем .env из текущей директории или папки api/
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../api/.env"),
    path.resolve(import.meta.dirname, "../.env"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
      console.log(`Загружен .env из ${file}`);
      break;
    }
  }
}

loadEnv();

const { Pool } = pg;
const connectionString = process.env.SELFHOSTED_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("\nОШИБКА: переменная DATABASE_URL не найдена.");
  console.error("Убедитесь что в папке api/ есть файл .env с DATABASE_URL=postgresql://...\n");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args[0];
  const passArg = args[1];

  console.log("\n=== Сброс пароля / Создание аккаунта NordSOCKS ===\n");

  const email = emailArg || await ask("Email: ");
  if (!email) { console.error("Email обязателен."); process.exit(1); }

  const password = passArg || await ask("Новый пароль (мин. 6 символов): ");
  if (!password || password.length < 6) {
    console.error("Пароль должен быть не менее 6 символов.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO sh_users (email, password_hash, role, two_fa_enabled, is_blocked)
       VALUES ($1, $2, 'admin', false, false)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = $2, is_blocked = false
       RETURNING id, email, role`,
      [email, hash]
    );
    const user = res.rows[0];
    console.log(`\n✅ Готово!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Роль:  ${user.role}`);
    console.log(`   Теперь войдите с новым паролем.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("\nОшибка:", err.message, "\n");
  process.exit(1);
});
