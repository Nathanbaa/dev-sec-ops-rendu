const { Pool } = require("pg");

// Configuration via variables d'environnement (pas de secrets en dur en production)
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "myapp",
});

if (process.env.NODE_ENV === "production" && !process.env.DB_PASSWORD) {
  console.error("DB_PASSWORD must be set in production");
  process.exit(1);
}

module.exports = pool;
