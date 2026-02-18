const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prometheus = require("../prometheus/prometheus-config");
const trace = require("@opentelemetry/api").trace;

const tracer = trace.getTracer("devsecops-api", "1.0.0");
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

router.post("/login", async (req, res) => {
  const span = tracer.startSpan("auth.login");

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      if (prometheus.loginAttempts) {
        prometheus.loginAttempts.inc({ status: "failed" });
      }

      span.end();

      return res.status(400).json({ error: "Username and password required" });
    }

    const result = await pool.query(
      "SELECT id, username, email, role, password FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      if (prometheus.loginAttempts) {
        prometheus.loginAttempts.inc({ status: "failed" });
      }

      span.end();

      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      if (prometheus.loginAttempts) {
        prometheus.loginAttempts.inc({ status: "failed" });
      }

      span.end();

      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (prometheus.loginAttempts) {
      prometheus.loginAttempts.inc({ status: "success" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    span.end();
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (prometheus.loginAttempts) {
      prometheus.loginAttempts.inc({ status: "failed" });
    }
    span.end();

    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
