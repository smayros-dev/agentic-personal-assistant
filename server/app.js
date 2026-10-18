import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import os from "node:os";
import path from "node:path";
import { unlink } from "node:fs/promises";
import {
  runAgent,
  listOllamaModels,
  LLMUnavailableError,
  toHistoryMessages,
  DEFAULT_MODEL,
} from "./agent.js";
import { chatMessageSchema, memoryCreateSchema, formatValidationError } from "./validators.js";
import { ingestData } from "./ingest.js";
import {
  getVectorStoreConfig,
  assertVectorStoreConfigured,
  deleteDocumentVectors,
  VectorStoreConfigError,
} from "./vectorstore.js";
import { addMemory, listMemories, deleteMemory, clearMemories } from "./memories.js";
import { initSse, sendSse, startHeartbeat } from "./sse.js";
import {
  addDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  searchDocuments,
  getDocumentStats,
} from "./documents.js";
import {
  saveMessage,
  getConversation,
  getAllConversations,
  deleteConversation,
  getConversationStats,
} from "./chatHistory.js";
import {
  advancedSearch,
  searchByDateRange,
  searchByFileSizeRange,
  getSearchFacets,
  getSearchSuggestions,
  exportSearchResults,
  getSimilarDocuments,
} from "./advancedSearch.js";
import {
  exportDocumentsAsJSON,
  exportDocumentsAsCSV,
  exportDocumentsAsText,
  exportConversationsAsJSON,
  exportConversationsAsCSV,
  exportConversationWithMessagesAsJSON,
  exportConversationAsText,
  exportFullDatabaseAsJSON,
  generateExportFileName,
} from "./export.js";

/**
 * Builds the configured Express app (without listening), so tests can start it
 * on an ephemeral port.
 */
export function createApp() {
  const app = express();

  // --- Logging ---
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // --- Security Headers (Helmet) ---
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    })
  );
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.frameguard({ action: "deny" }));
  app.use(helmet.noSniff());
  app.use(helmet.xssFilter());

  // --- CORS: restrict to an explicit allow-list (comma-separated CORS_ORIGIN env var) ---
  // Default includes localhost dev ports for Vite flexibility
  const allowedOrigins = (
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
  )
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
  // so the client can offer a model picker (defaultModel: the server's OLLAMA_MODEL).
  app.get("/api/models", requireApiKey, async (_req, res, next) => {
    try {
      const models = await listOllamaModels();
      res.json({ models, defaultModel: DEFAULT_MODEL });
    } catch (err) {
      next(err);
    }
  });

  // Loads prior turns for the agent and stores the user's message.
  const prepareChat = (body) => {
    const { message, sessionId, model, documentId } = chatMessageSchema.parse(body);
    const history = sessionId ? toHistoryMessages(getConversation(sessionId)) : [];
    if (sessionId) {
      saveMessage(sessionId, "user", message, model);
    }
    return { message, sessionId, model, documentId, history };
  };

  const EMPTY_ANSWER =
    "I apologize, but I couldn't generate a proper response. Could you please rephrase your question?";

  // Chat endpoint
  app.post("/api/chat", requireApiKey, async (req, res, next) => {
    try {
      const chat = prepareChat(req.body);
      const result = await runAgent(chat);
      const output = result?.output || "";

      if (!output || output.trim() === "") {
        return res.json({ answer: EMPTY_ANSWER, citations: [], steps: [] });
      }

      if (chat.sessionId) {
        saveMessage(chat.sessionId, "assistant", output, chat.model, {
          citations: result.citations,
          steps: result.steps,
        });
      }

      res.json({
        answer: output,
        citations: result.citations || [],
        steps: result.steps || [],
        sessionId: chat.sessionId,
      });
    } catch (err) {
      next(err);
    }
  });

  // Streaming chat endpoint (Server-Sent Events): emits start, tool_call,
  // tool_result, token, reset and finally done (or error) events.
  app.post("/api/chat/stream", requireApiKey, async (req, res, next) => {
    let chat;
    try {
      chat = prepareChat(req.body);
    } catch (err) {
      return next(err);
    }

    initSse(res);
    const stopHeartbeat = startHeartbeat(res);
    const abort = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) abort.abort();
    });

    try {
      sendSse(res, { type: "start", sessionId: chat.sessionId, model: chat.model });
      const result = await runAgent({
        ...chat,
        signal: abort.signal,
        onEvent: (event) => sendSse(res, event),
      });
      const hasOutput = Boolean(result?.output?.trim());
      const answer = hasOutput ? result.output : EMPTY_ANSWER;

      if (chat.sessionId && hasOutput) {
        saveMessage(chat.sessionId, "assistant", answer, chat.model, {
          citations: result.citations,
          steps: result.steps,
        });
      }

      sendSse(res, {
        type: "done",
        answer,
        citations: result?.citations || [],
        steps: result?.steps || [],
      });
    } catch (err) {
      if (!abort.signal.aborted) console.error(err);
      sendSse(res, {
        type: "error",
        message:
          err instanceof LLMUnavailableError
            ? err.message
            : "Something went wrong while generating the answer.",
      });
    } finally {
      stopHeartbeat();
      res.end();
    }
  });

  // PDF ingestion endpoint
  app.post("/api/ingest", requireApiKey, upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file?.path) {
        return res.status(400).json({ error: "Missing PDF file" });
      }

      // Fails fast (503) when the selected vector store isn't configured
      assertVectorStoreConfigured();

      const fileName = req.file.originalname || `document-${Date.now()}.pdf`;
      const documentId = `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { chunkCount, pageCount } = await ingestData(req.file.path, { fileName, documentId });

      // Track document in document management system
      const document = addDocument(documentId, {
        fileName,
        source: fileName,
        size: req.file.size,
        mimeType: req.file.mimetype,
        chunkCount,
        pageCount,
      });

      await unlink(req.file.path).catch(() => undefined);

      return res.json({
        ok: true,
        message: `✅ PDF ingested successfully`,
        documentId,
        chunkCount,
        pageCount,
        document,
      });
    } catch (err) {
      if (req.file?.path) {
        await unlink(req.file.path).catch(() => undefined);
      }
      next(err);
    }
  });

  // --- Document Management Endpoints ---

  // List all documents
  app.get("/api/documents", requireApiKey, (_req, res) => {
    const documents = listDocuments();
    res.json({
      documents,
      count: documents.length,
      stats: getDocumentStats(),
    });
  });

  // Get specific document
  app.get("/api/documents/:id", requireApiKey, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ document: doc });
  });

  // Search documents
  app.post("/api/documents/search", requireApiKey, (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query required" });
    }
    const results = searchDocuments(query);
    res.json({
      results,
      count: results.length,
    });
  });

  // Delete document (and its vectors, so it stops appearing in answers)
  app.delete("/api/documents/:id", requireApiKey, async (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    let vectorsDeleted;
    try {
      vectorsDeleted = await deleteDocumentVectors({
        documentId: doc.id,
        chunkCount: doc.chunkCount,
        fileName: doc.fileName,
      });
    } catch (err) {
      console.error("❌ Failed to delete document vectors:", err);
      return res
        .status(503)
        .json({ error: "Could not delete document vectors (vector store unavailable)" });
    }

    deleteDocument(doc.id);
    res.json({
      ok: true,
      message: "Document deleted successfully",
      vectorsDeleted,
    });
  });

  // Document statistics
  app.get("/api/documents/stats/overview", requireApiKey, (_req, res) => {
    const stats = getDocumentStats();
    res.json(stats);
  });

  // --- ADVANCED SEARCH ENDPOINTS ---

  // Advanced search with filters, sorting, pagination
  app.post("/api/documents/search/advanced", requireApiKey, (req, res) => {
    try {
      const { query, sortBy, sortOrder, limit, offset } = req.body;
      const results = advancedSearch({ query, sortBy, sortOrder, limit, offset });
      res.json(results);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Search by date range
  app.post("/api/documents/search/by-date", requireApiKey, (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const results = searchByDateRange({ startDate, endDate });
      res.json({ results, count: results.length });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Search by file size range
  app.post("/api/documents/search/by-size", requireApiKey, (req, res) => {
    try {
      const { minSize, maxSize } = req.body;
      const results = searchByFileSizeRange({ minSize, maxSize });
      res.json({ results, count: results.length });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get search facets
  app.get("/api/documents/search/facets", requireApiKey, (req, res) => {
    const facets = getSearchFacets();
    res.json(facets);
  });

  // Get search suggestions (autocomplete)
  app.get("/api/documents/search/suggestions", requireApiKey, (req, res) => {
    const { prefix, limit } = req.query;
    const suggestions = getSearchSuggestions(prefix || "", parseInt(limit) || 10);
    res.json({ suggestions });
  });

  // Export search results
  app.post("/api/documents/search/export", requireApiKey, (req, res) => {
    try {
      const { query, sortBy, sortOrder } = req.body;
      const exportData = exportSearchResults({ query, sortBy, sortOrder });
      res.json(exportData);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get similar documents
  app.get("/api/documents/:id/similar", requireApiKey, (req, res) => {
    try {
      const { similarityType } = req.query;
      const similar = getSimilarDocuments(req.params.id, similarityType || "size");
      res.json({ similar });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- EXPORT ENDPOINTS ---

  // Export all documents as JSON
  app.get("/api/export/documents/json", requireApiKey, (req, res) => {
    try {
      const documents = listDocuments();
      const json = exportDocumentsAsJSON(documents);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("documents", "json")}"`
      );
      res.setHeader("Content-Type", "application/json");
      res.json(json);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export all documents as CSV
  app.get("/api/export/documents/csv", requireApiKey, (req, res) => {
    try {
      const documents = listDocuments();
      const csv = exportDocumentsAsCSV(documents);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("documents", "csv")}"`
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export all documents as Text
  app.get("/api/export/documents/text", requireApiKey, (req, res) => {
    try {
      const documents = listDocuments();
      const text = exportDocumentsAsText(documents);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("documents", "txt")}"`
      );
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export all conversations as JSON
  app.get("/api/export/conversations/json", requireApiKey, (req, res) => {
    try {
      const conversations = getAllConversations();
      const json = exportConversationsAsJSON(conversations);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("conversations", "json")}"`
      );
      res.setHeader("Content-Type", "application/json");
      res.json(json);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export all conversations as CSV
  app.get("/api/export/conversations/csv", requireApiKey, (req, res) => {
    try {
      const conversations = getAllConversations();
      const csv = exportConversationsAsCSV(conversations);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("conversations", "csv")}"`
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export specific conversation with messages as JSON
  app.get("/api/export/conversations/:sessionId/json", requireApiKey, (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = getConversation(sessionId);
      const json = exportConversationWithMessagesAsJSON(sessionId, messages);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName(`conversation-${sessionId}`, "json")}"`
      );
      res.setHeader("Content-Type", "application/json");
      res.json(json);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export specific conversation as Text
  app.get("/api/export/conversations/:sessionId/text", requireApiKey, (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = getConversation(sessionId);
      const text = exportConversationAsText(sessionId, messages);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName(`conversation-${sessionId}`, "txt")}"`
      );
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Export full database as JSON
  app.get("/api/export/database/full", requireApiKey, (req, res) => {
    try {
      const json = exportFullDatabaseAsJSON();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${generateExportFileName("database-full", "json")}"`
      );
      res.setHeader("Content-Type", "application/json");
      res.json(json);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- CHAT HISTORY ENDPOINTS ---

  // Get conversation history for a session
  app.get("/api/conversations/:sessionId", requireApiKey, (req, res) => {
    const { sessionId } = req.params;
    const messages = getConversation(sessionId);
    res.json({ messages });
  });

  // Get all conversations
  app.get("/api/conversations", requireApiKey, (_req, res) => {
    const conversations = getAllConversations();
    res.json({ conversations });
  });

  // Delete conversation
  app.delete("/api/conversations/:sessionId", requireApiKey, (req, res) => {
    const { sessionId } = req.params;
    const deleted = deleteConversation(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ ok: true, message: "Conversation deleted successfully" });
  });

  // Get conversation statistics
  app.get("/api/conversations/stats/overview", requireApiKey, (_req, res) => {
    const stats = getConversationStats();
    res.json(stats);
  });

  // --- LONG-TERM MEMORY ENDPOINTS ---

  app.get("/api/memories", requireApiKey, (_req, res) => {
    const memories = listMemories();
    res.json({ memories, count: memories.length });
  });

  app.post("/api/memories", requireApiKey, (req, res, next) => {
    try {
      const { content, category } = memoryCreateSchema.parse(req.body);
      const { memory, created } = addMemory({ content, category });
      res.status(created ? 201 : 200).json({ memory, created });
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/memories/:id", requireApiKey, (req, res) => {
    if (!deleteMemory(req.params.id)) {
      return res.status(404).json({ error: "Memory not found" });
    }
    res.json({ ok: true });
  });

  app.delete("/api/memories", requireApiKey, (_req, res) => {
    res.json({ ok: true, deleted: clearMemories() });
  });

  // Centralized error handler: logs full details server-side, returns a
  // sanitized message to the client so internal error details never leak.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);

    // Handle Zod validation errors
    if (err.name === "ZodError") {
      return res.status(400).json(formatValidationError(err));
    }

    // Malformed JSON body (express.json / body-parser)
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    // CORS errors should be handled by cors() middleware, but if we get here,
    // ensure the response has CORS headers so browser doesn't block it
    const origin = req.get("origin");
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }

    if (err instanceof LLMUnavailableError || err instanceof VectorStoreConfigError) {
      return res.status(503).json({ error: err.message });
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large (max 25MB)" });
    }

    // Pinecone connection errors (SSL, API key, network)
    if (
      err.name === "PineconeConnectionError" ||
      err.message?.includes("PineconeConnectionError")
    ) {
      console.error("❌ Pinecone Connection Error:", {
        message: err.message,
        cause: err.cause?.message,
        code: err.cause?.code,
      });

      // Check for common causes
      if (err.cause?.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY") {
        return res.status(503).json({
          error: "Cannot connect to Pinecone. Check your PINECONE_API_KEY and network connection.",
        });
      }

      return res.status(503).json({
        error: "Pinecone service unavailable. Please try again later.",
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

  return app;
}
