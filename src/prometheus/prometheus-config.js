const promClient = require("prom-client");
const express = require("express");
const router = express.Router();

// Activer les métriques par défaut (CPU, RAM, etc.)
promClient.collectDefaultMetrics();

// Créer un compteur custom pour toutes les requêtes HTTP
const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Compteur pour les tentatives de login (cf. J3 matin - métriques custom)
const loginAttempts = new promClient.Counter({
  name: "login_attempts_total",
  help: "Total number of login attempts",
  labelNames: ["status"],
});
loginAttempts.inc({ status: "success" }, 0);
loginAttempts.inc({ status: "failed" }, 0);

// Compteur pour l'enregistrement utilisateur (observabilité événements critiques)
const userRegistrations = new promClient.Counter({
  name: "user_registrations_total",
  help: "Total number of user registration attempts",
  labelNames: ["status"],
});
userRegistrations.inc({ status: "success" }, 0);
userRegistrations.inc({ status: "failed" }, 0);

// Compteur pour le téléchargement de fichiers
const fileDownloads = new promClient.Counter({
  name: "file_downloads_total",
  help: "Total number of file download attempts",
  labelNames: ["status"],
});
fileDownloads.inc({ status: "success" }, 0);
fileDownloads.inc({ status: "denied" }, 0);
fileDownloads.inc({ status: "not_found" }, 0);

// Incrémenter dans un middleware
router.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || "unknown",
      status: res.statusCode,
    });
  });
  next();
});

// Endpoint /metrics pour Prometheus
router.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// On exporte le router (comportement existant)
module.exports = router;
module.exports.loginAttempts = loginAttempts;
module.exports.userRegistrations = userRegistrations;
module.exports.fileDownloads = fileDownloads;