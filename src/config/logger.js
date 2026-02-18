const fs = require("fs");
const path = require("path");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

// Créer le dossier logs s'il n'existe pas (sinon winston-daily-rotate-file peut échouer)
const logsDir = path.join(process.cwd(), "logs");
let logsDirAvailable = true;
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    logsDirAvailable = false; // ex. Docker sans droit d'écriture sur /app/logs
  }
}

// Niveau de log selon l'environnement
const level =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Format JSON pour faciliter le parsing
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Format lisible pour la console en dev
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level,
  format: jsonFormat,
  defaultMeta: { service: "devsecops-api" },
  transports: logsDirAvailable
    ? [
        new DailyRotateFile({
          filename: path.join(logsDir, "app-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          maxFiles: "14d",
        }),
        new DailyRotateFile({
          level: "error",
          filename: path.join(logsDir, "error-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          maxFiles: "30d",
        }),
      ]
    : [],
});

// Console : en dev (format lisible) et en prod (JSON sur stdout pourr remonter les logs Docker)
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: jsonFormat,
    })
  );
}

module.exports = logger;
