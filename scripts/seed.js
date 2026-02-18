/**
 * Seed initial users with bcrypt-hashed passwords.
 * Run once after DB is up (or app seeds on first start).
 */
require("dotenv").config();

const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "myapp",
});

const SALT_ROUNDS = 10;
const DEFAULT_USERS = [
  {
    username: "admin",
    password: "admin123",
    email: "admin@example.com",
    role: "admin",
  },
  {
    username: "user",
    password: "password",
    email: "user@example.com",
    role: "user",
  },
  {
    username: "alice",
    password: "alice2024",
    email: "alice@example.com",
    role: "user",
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    const r = await client.query("SELECT COUNT(*) FROM users");

    if (parseInt(r.rows[0].count, 10) > 0) {
      console.log("Users already exist, skip seed.");
      return;
    }
    for (const u of DEFAULT_USERS) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);

      await client.query(
        `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [u.username, u.email, hash, u.role]
      );
    }
    console.log("Seed: default users created.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
