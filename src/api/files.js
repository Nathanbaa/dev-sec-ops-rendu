const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const prometheus = require("../prometheus/prometheus-config");
const trace = require("@opentelemetry/api").trace;

const tracer = trace.getTracer("devsecops-api", "1.0.0");

function uploadPath() {
  return path.join(__dirname, "../../uploads");
}

function test() {
  return 1;
}

router.get("/files", (req, res) => {
  const span = tracer.startSpan("api.files.download");
  const filename = req.query.name;

  if (!filename || filename.includes("..") || path.isAbsolute(filename)) {
    if (prometheus.fileDownloads) {
      prometheus.fileDownloads.inc({ status: "denied" });
    }

    span.end();

    return res.status(400).json({ error: "Invalid file name" });
  }

  const uploadsDir = path.resolve(uploadPath());
  const filepath = path.join(uploadsDir, path.normalize(filename));

  let resolvedPath;

  try {
    resolvedPath = fs.realpathSync(filepath);
  } catch {
    if (prometheus.fileDownloads) {
      prometheus.fileDownloads.inc({ status: "not_found" });
    }

    span.end();

    return res.status(404).json({ error: "File not found" });
  }

  if (!resolvedPath.startsWith(uploadsDir)) {
    if (prometheus.fileDownloads) {
      prometheus.fileDownloads.inc({ status: "denied" });
    }

    span.end();

    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const content = fs.readFileSync(resolvedPath);

    if (prometheus.fileDownloads) {
      prometheus.fileDownloads.inc({ status: "success" });
    }

    span.end();

    res.send(content);
  } catch (err) {
    if (prometheus.fileDownloads) {
      prometheus.fileDownloads.inc({ status: "not_found" });
    }

    span.end();

    res.status(404).json({ error: "File not found" });
  }
});

module.exports = router;
module.exports.upload_path = uploadPath;
module.exports.test = test;
