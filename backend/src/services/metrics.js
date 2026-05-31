const client = require("prom-client");

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: "todo_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "todo_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const tasksCreatedTotal = new client.Counter({
  name: "todo_tasks_created_total",
  help: "Total number of tasks created",
});

const attachmentsUploadedTotal = new client.Counter({
  name: "todo_attachments_uploaded_total",
  help: "Total number of note attachments uploaded",
});

function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on("finish", () => {
    if (req.path === "/metrics") return;

    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    const route = req.route?.path || req.path || "unknown";
    const status = res.statusCode.toString();

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status,
      },
      duration
    );
  });

  next();
}

async function metricsHandler(req, res) {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  tasksCreatedTotal,
  attachmentsUploadedTotal,
};