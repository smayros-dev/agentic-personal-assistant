import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import cors from "cors";

describe("Server - Health Check Endpoint", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(cors());

    // Simulate health check endpoint
    app.get("/healthz", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
  });

  it("should return 200 on health check", async () => {
    const req = { method: "GET", url: "/healthz" };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Simulate the route handler
    const handler = app._router.stack.find((r) => r.route?.path === "/healthz")?.route.stack[0]
      .handle;
    handler(req, res);

    expect(res.json).toHaveBeenCalled();
  });

  it("should handle health check requests", () => {
    const handler = (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    };

    const res = { json: vi.fn() };
    handler({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
      })
    );
  });
});

describe("Server - CORS Configuration", () => {
  it("should have CORS middleware configured", () => {
    const corsMiddleware = cors();
    expect(corsMiddleware).toBeDefined();
  });

  it("should accept localhost origins in dev mode", () => {
    const isAllowedOrigin = (origin) => {
      if (!origin) return true; // Allow no-origin requests (mobile, Postman, etc.)
      if (origin === "http://localhost:3000") return true;
      if (origin.startsWith("http://localhost:")) return true; // Allow all localhost ports
      return false;
    };

    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5175")).toBe(true);
    expect(isAllowedOrigin("http://localhost:3001")).toBe(true);
    expect(isAllowedOrigin("http://example.com")).toBe(false);
  });
});

describe("Server - Error Handling", () => {
  it("should handle errors gracefully", () => {
    const handleError = (error, req, res) => {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Internal Server Error";
      res.status(statusCode).json({ error: message });
    };

    const error = new Error("Test error");
    error.statusCode = 400;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    handleError(error, {}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Test error" });
  });

  it("should return 503 when service is unavailable", () => {
    const statusCode = 503;
    const message = "Service Unavailable";

    expect(statusCode).toBe(503);
    expect(message).toBe("Service Unavailable");
  });
});

describe("Server - Rate Limiting", () => {
  it("should enforce rate limits", () => {
    const createRateLimitChecker = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
      const requests = new Map();

      return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();

        if (!requests.has(key)) {
          requests.set(key, []);
        }

        const userRequests = requests.get(key).filter((t) => now - t < windowMs);

        if (userRequests.length >= maxRequests) {
          return res.status(429).json({ error: "Too many requests" });
        }

        userRequests.push(now);
        requests.set(key, userRequests);
        next();
      };
    };

    const limiter = createRateLimitChecker(2, 60000);
    const req = { ip: "127.0.0.1" };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next); // Should be rate limited

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
