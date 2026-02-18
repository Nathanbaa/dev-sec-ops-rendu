function sanitizeForLogs(obj) {
  const sanitized = { ...obj };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "authorization",
  ];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }
  return sanitized;
}

module.exports = { sanitizeForLogs };
