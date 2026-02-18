const logger = require("../config/logger");

function requestLogger(req, res, next) {
  const start = Date.now();
  // Logger la requête entrante
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    // ⚠️ PAS req.headers (contient Authorization)
  });
  // Logger la réponse quand elle est envoyée
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[logLevel]("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id, // Si authentifié
    });
  });
  next();
}

module.exports = requestLogger;
