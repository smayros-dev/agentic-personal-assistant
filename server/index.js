import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import rateLimit from "express-rate-limit";
import os from "node:os";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { runAgent, listOllamaModels, LLMUnavailableError } from "./agent.js";
import { ingestData } from "./ingest.js";
import { getVectorStoreConfig } from "./vectorstore.js";

const app = express();
const PORT = process.env.PORT || 3001;

// --- Logging ---
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// --- CORS: restrict to an explicit allow-list (comma-separated CORS_ORIGIN env var) ---
// Default includes localhost dev ports for Vite flexibility
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Development mode: accept all localhost
const isDev = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow all localhost origins
      if (isDev && origin && origin.includes("localhost")) {
        return callback(null, true);
      }
      // In production, check allowlist
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

// --- Body parsing with a sane size limit ---
app.use(express.json({ limit: "1mb" }));

// --- Optional API key auth: only enforced if API_KEY is set in the environment ---
const apiKey = process.env.API_KEY;
const requireApiKey = (req, res, next) => {
  if (!apiKey) return next();
  if (req.get("x-api-key") === apiKey) return next();
  return res.status(401).json({ error: "Unauthorized" });
};

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Multer for PDF uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      (file.originalname || "").toLowerCase().endsWith(".pdf");
    cb(isPdf ? null : new Error("Only PDF files are allowed"), isPdf);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

const MAX_MESSAGE_LENGTH = 4000;

// Health check
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Vector store configuration endpoint
app.get("/api/config", requireApiKey, (_req, res) => {
  const config = getVectorStoreConfig();
  res.json({
    vectorStore: config.provider.toUpperCase(),
    config,
  });
});

// Lists models currently installed/pulled in the local Ollama instance,
// so the client can offer a model picker.
app.get("/api/models", requireApiKey, async (_req, res, next) => {
  try {
    const models = await listOllamaModels();
    res.json({ models });
  } catch (err) {
    next(err);
  }
});

// Chat endpoint
app.post("/api/chat", requireApiKey, async (req, res, next) => {
  try {
    const { message, sessionId, model } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res
        .status(400)
        .json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }
    if (model !== undefined && typeof model !== "string") {
      return res.status(400).json({ error: "Invalid model" });
    }

    const answer = await runAgent({ message, sessionId, model });

    const output = answer?.output || answer?.text || "";

    if (!output || output.trim() === "") {
      return res.json({
        answer:
          "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?",
      });
    }

    res.json({ answer: output });
  } catch (err) {
    next(err);
  }
});

// PDF ingestion endpoint
app.post("/api/ingest", requireApiKey, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "Missing PDF file" });
    }

    // Validate Pinecone credentials before attempting ingestion
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX;

    if (!apiKey || !indexName) {
      console.warn("⚠️ Pinecone not configured. Set PINECONE_API_KEY and PINECONE_INDEX in server/.env");
      await unlink(req.file.path).catch(() => undefined);
      return res.status(503).json({
        error: "Pinecone not configured. Please set PINECONE_API_KEY and PINECONE_INDEX in server/.env"
      });
    }

    await ingestData(req.file.path, req.file.originalname);
    await unlink(req.file.path).catch(() => undefined);

    return res.json({ ok: true, message: `✅ PDF ingested successfully` });
  } catch (err) {
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => undefined);
    }
    next(err);
  }
});

// Centralized error handler: logs full details server-side, returns a
// sanitized message to the client so internal error details never leak.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);

  // CORS errors should be handled by cors() middleware, but if we get here,
  // ensure the response has CORS headers so browser doesn't block it
  const origin = req.get("origin");
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  if (err instanceof LLMUnavailableError) {
    return res.status(503).json({ error: err.message });
  }

  // Pinecone connection errors (SSL, API key, network)
  if (err.name === "PineconeConnectionError" || err.message?.includes("PineconeConnectionError")) {
    console.error("❌ Pinecone Connection Error:", {
      message: err.message,
      cause: err.cause?.message,
      code: err.cause?.code
    });
    
    // Check for common causes
    if (err.cause?.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY") {
      return res.status(503).json({
        error: "Cannot connect to Pinecone. Check your PINECONE_API_KEY and network connection."
      });
    }
    
    return res.status(503).json({
      error: "Pinecone service unavailable. Please try again later."
    });
  }

  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.startsWith("Origin")) {
    return res.status(403).json({ error: "Origin not allowed by CORS policy" });
  }

  // Generic error message to client
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
