const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const prometheus = require("../prometheus/prometheus-config");
const trace = require("@opentelemetry/api").trace;

const SALT_ROUNDS = 10;
const ROLE_USER = "user";
const tracer = trace.getTracer("devsecops-api", "1.0.0");

const validateUser = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

router.post("/users", validateUser, async (req, res) => {
  const span = tracer.startSpan("api.users.register");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (prometheus.userRegistrations) {
        prometheus.userRegistrations.inc({ status: "failed" });
      }

      span.end();

      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const role = ROLE_USER;

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)",
      [email, email, hash, role]
    );

    if (prometheus.userRegistrations) {
      prometheus.userRegistrations.inc({ status: "success" });
    }

    span.end();

    res.status(201).json({ success: true });
  } catch (err) {
    if (prometheus.userRegistrations) {
      prometheus.userRegistrations.inc({ status: "failed" });
    }

    span.end();

    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }

    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
});

module.exports = router;
