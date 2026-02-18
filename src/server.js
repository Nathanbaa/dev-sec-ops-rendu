require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const logger = require("./config/logger");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const prometheusRouter = require("./prometheus/prometheus-config");
const requestLogger = require("./middlewares/requestLogger");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(prometheusRouter);
app.use(requestLogger);

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  // Créer quelques fichiers de test
  fs.writeFileSync(path.join(uploadsDir, "photo.jpg"), "fake image content");
  fs.writeFileSync(path.join(uploadsDir, "document.pdf"), "fake pdf content");
}

// Routes
const loginRouter = require("./auth/login");
const filesRouter = require("./api/files");
const usersRouter = require("./api/users");

// Page d'accueil
app.get("/", (req, res) => {
  res.json({
    message: "API DevSecOps - Exercice Jour 1",
    warning: "API sécurisée (JWT, requêtes préparées, validation)",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Authentification",
        example: {
          username: "admin",
          password: "admin123",
        },
      },
      {
        method: "GET",
        path: "/api/files?name=photo.jpg",
        description: "Téléchargement de fichiers",
        example: "/api/files?name=photo.jpg",
      },
      {
        method: "POST",
        path: "/api/users",
        description: "Création d'utilisateur (CHALLENGE)",
        example: {
          email: "user@example.com",
          password: "mypassword",
          role: "user",
        },
      },
      {
        method: "GET",
        path: "/api/health",
        description: "Health check",
        example: "/api/health",
      },
    ],
    exercises: [
      "1. Analyser le code de /api/auth/login et trouver les vulnérabilités",
      "2. Analyser le code de /api/files et trouver les vulnérabilités",
      "3. Analyser le code de /api/users et trouver TOUTES les vulnérabilités (CHALLENGE)",
      "4. Configurer git-secrets pour bloquer les commits de secrets",
    ],
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OpenAPI spec pour OWASP ZAP (DAST)
app.get("/openapi.yaml", (req, res) => {
  res.type("yaml").sendFile(path.join(__dirname, "../openapi.yaml"));
});

// Monter les routes
app.use("/api/auth", loginRouter);
app.use("/api", filesRouter);
app.use("/api", usersRouter);
app.use("/", prometheusRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler avec logs
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", {
    message: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    // ⚠️ PAS err.stack en production
  });
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// Démarrage du serveur
function printBanner(port) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚨 API DevSecOps - Exercice Jour 1                          ║
║                                                                ║
║   Serveur démarré sur : http://localhost:${port}                 ║
║                                                                ║
║   🔒 API sécurisée (JWT, requêtes préparées, validation)      ║
║                                                                ║
║   📚 Endpoints : GET /, POST /api/auth/login (JWT),           ║
║      GET /api/files?name=..., POST /api/users                 ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
}

function runSeed() {
  const pool = require("./config/database");
  const bcrypt = require("bcrypt");
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
  pool
    .query("SELECT COUNT(*), MAX(LENGTH(password)) AS max_len FROM users")
    .then((r) => {
      const count = parseInt(r.rows[0].count, 10);
      const maxLen = parseInt(r.rows[0].max_len || "0", 10);
      const needsHash = count > 0 && maxLen < 60;
      if (count === 0) {
        return Promise.all(
          DEFAULT_USERS.map((u) =>
            bcrypt
              .hash(u.password, SALT_ROUNDS)
              .then((hash) =>
                pool.query(
                  "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
                  [u.username, u.email, hash, u.role]
                )
              )
          )
        );
      }
      if (needsHash) {
        return Promise.all(
          DEFAULT_USERS.map((u) =>
            bcrypt
              .hash(u.password, SALT_ROUNDS)
              .then((hash) =>
                pool.query(
                  "UPDATE users SET password = $1 WHERE username = $2",
                  [hash, u.username]
                )
              )
          )
        );
      }
      return null;
    })
    .then(() => logger.info("Seed check done"))
    .catch((err) => logger.warn("Seed check failed", { message: err.message }));
}

function startServer(port, remainingRetries = 20) {
  const server = app.listen(port, () => {
    printBanner(port);
    logger.info("Server started", { port, env: process.env.NODE_ENV });
    runSeed();
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      if (remainingRetries <= 0) {
        console.error(
          `Port ${port} déjà utilisé et plus de retry disponible. ` +
            `Lance le serveur avec PORT=xxxx (ex: PORT=3001 npm run dev) ou libère le port.`
        );
        process.exit(1);
      }

      console.warn(`Port ${port} déjà utilisé, tentative sur ${port + 1}...`);
      server.close(() => startServer(port + 1, remainingRetries - 1));
      return;
    }

    console.error("Erreur serveur:", err);
    process.exit(1);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = app;
