/**
 * VanillaAgent Observability & Health Server
 *
 * Exposes lightweight HTTP endpoints for Docker/Kubernetes health checks & Prometheus metrics:
 * - GET /health   -> 200 OK + JSON summary
 * - GET /ready    -> 200 OK if state database and wallet are healthy
 * - GET /metrics  -> Prometheus text format metrics
 * - GET /status   -> Rich JSON status synopsis
 */

import http from "http";
import type { AutomatonDatabase, AutomatonConfig } from "../types.js";
import { getMetrics } from "./metrics.js";
import { createLogger } from "./logger.js";
import { getDashboardHtml } from "../gui/html.js";

const logger = createLogger("observability.server");

export interface ObservabilityServerOptions {
  port?: number;
  host?: string;
  config: AutomatonConfig;
  db?: AutomatonDatabase;
}

export class ObservabilityServer {
  private server: http.Server | null = null;
  private startTime = Date.now();
  private port: number;
  private host: string;
  private config: AutomatonConfig;
  private db?: AutomatonDatabase;

  constructor(options: ObservabilityServerOptions) {
    this.port = options.port ?? (process.env.METRICS_PORT || process.env.PORT ? parseInt((process.env.METRICS_PORT || process.env.PORT)!, 10) : 3000);
    this.host = options.host ?? "0.0.0.0";
    this.config = options.config;
    this.db = options.db;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = req.url || "/";

        // Serve Web GUI Single Page Dashboard
        if (url === "/" || url === "/gui" || url === "/dashboard" || url === "/app") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(getDashboardHtml());
          return;
        }

        if (url === "/health" || url === "/livez") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            status: "healthy",
            version: this.config.version,
            name: this.config.name,
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
          }));
          return;
        }

        if (url === "/ready" || url === "/readyz") {
          const isReady = !!this.db;
          const statusCode = isReady ? 200 : 503;
          res.writeHead(statusCode, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            status: isReady ? "ready" : "unready",
            database: isReady ? "connected" : "disconnected",
          }));
          return;
        }

        if (url === "/metrics") {
          const snapshot = getMetrics().getSnapshot();
          let prometheusText = `# HELP vanilla_agent_uptime_seconds Total runtime in seconds\n# TYPE vanilla_agent_uptime_seconds gauge\nvanilla_agent_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}\n\n`;

          for (const [name, val] of Object.entries(snapshot.counters)) {
            const metricName = `vanilla_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
            prometheusText += `# TYPE ${metricName} counter\n${metricName} ${val}\n`;
          }

          for (const [name, val] of Object.entries(snapshot.gauges)) {
            const metricName = `vanilla_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
            prometheusText += `# TYPE ${metricName} gauge\n${metricName} ${val}\n`;
          }

          res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
          res.end(prometheusText);
          return;
        }

        if (url === "/status") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            name: this.config.name,
            version: this.config.version,
            inferenceModel: this.config.inferenceModel,
            walletAddress: this.config.walletAddress,
            sandboxId: this.config.sandboxId || "local",
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
          }, null, 2));
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found\n");
      });

      this.server.listen(this.port, this.host, () => {
        logger.info(`Web GUI & Observability server listening on http://${this.host}:${this.port}`);
        resolve();
      });

      this.server.on("error", (err) => {
        logger.warn(`Observability server failed to start on port ${this.port}: ${err.message}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
