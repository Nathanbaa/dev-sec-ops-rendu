const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
// Exporteur OTLP vers Alloy
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTLP_EXPORTER_URL || "http://localhost:4320/v1/traces",
});

// Initialisation du SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "devsecops-api",
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
console.log("[Tracing] OpenTelemetry SDK initialized");
// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("[Tracing] SDK terminated"))
    .catch((error) => console.error("[Tracing] Error", error))
    .finally(() => process.exit(0));
});
module.exports = sdk;
