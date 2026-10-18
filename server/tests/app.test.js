import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../agent.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, runAgent: vi.fn(), listOllamaModels: vi.fn().mockResolvedValue(["m:1"]) };
});
vi.mock("../ingest.js", () => ({ ingestData: vi.fn() }));
vi.mock("../vectorstore.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    assertVectorStoreConfigured: vi.fn(),
    deleteDocumentVectors: vi.fn(),
    searchVectorStore: vi.fn().mockResolvedValue([]),
  };
});

const { createApp } = await import("../app.js");
const { runAgent, LLMUnavailableError } = await import("../agent.js");
const { ingestData } = await import("../ingest.js");
const { deleteDocumentVectors } = await import("../vectorstore.js");
const { addDocument, getDocument } = await import("../documents.js");
const { getConversation } = await import("../chatHistory.js");
const { resetDatabaseForTests } = await import("../db.js");

const SESSION = "6f1c2a1e-1111-4a5b-9c3d-123456789abc";

let server;
let baseUrl;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((r) => server.close(r)));

beforeEach(() => {
  resetDatabaseForTests();
  vi.clearAllMocks();
});

const post = (path, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("basic routes", () => {
  it("GET /healthz", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("POST /api/chat with empty body is a validation error", async () => {
    const res = await post("/api/chat", {});
    expect(res.status).toBe(400);
    expect((await res.json()).type).toBe("VALIDATION_ERROR");
  });

  it("GET /api/documents starts empty", async () => {
    const data = await (await fetch(`${baseUrl}/api/documents`)).json();
    expect(data).toMatchObject({ documents: [], count: 0 });
  });
});

describe("POST /api/chat", () => {
  it("returns answer with citations and passes history from SQLite", async () => {
    const citation = {
      id: 1,
      source: "a.pdf",
      page: 2,
      documentId: "doc-1",
      snippet: "x",
      score: 0.1,
    };
    runAgent.mockResolvedValue({ output: "hi", citations: [citation], steps: [] });

    const first = await post("/api/chat", { message: "hello", sessionId: SESSION });
    expect(await first.json()).toMatchObject({ answer: "hi", citations: [citation] });

    await post("/api/chat", { message: "again", sessionId: SESSION });
    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(runAgent.mock.calls[1][0].history).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]);

    const saved = getConversation(SESSION);
    expect(saved).toHaveLength(4);
    expect(saved[1].citations).toEqual([citation]);
  });

  it("maps LLMUnavailableError to 503", async () => {
    runAgent.mockRejectedValue(new LLMUnavailableError(new Error("ECONNREFUSED")));
    const res = await post("/api/chat", { message: "hello" });
    expect(res.status).toBe(503);
  });
});

describe("POST /api/chat/stream", () => {
  it("streams start, tokens and done, then saves the answer", async () => {
    runAgent.mockImplementation(async ({ onEvent }) => {
      onEvent({ type: "token", text: "he" });
      onEvent({ type: "token", text: "llo" });
      return { output: "hello", citations: [], steps: [] };
    });

    const res = await post("/api/chat/stream", { message: "hey", sessionId: SESSION });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);

    const body = await res.text();
    expect(body).toContain('"type":"start"');
    expect(body.match(/"type":"token"/g)).toHaveLength(2);
    expect(body).toContain('"type":"done","answer":"hello"');
    expect(getConversation(SESSION).map((m) => m.content)).toEqual(["hey", "hello"]);
  });

  it("emits an error event when the LLM is down", async () => {
    runAgent.mockRejectedValue(new LLMUnavailableError(new Error("ECONNREFUSED")));
    const body = await (await post("/api/chat/stream", { message: "hey" })).text();
    expect(body).toContain('"type":"error"');
  });

  it("rejects invalid input with a JSON 400 before streaming", async () => {
    const res = await post("/api/chat/stream", { message: "" });
    expect(res.status).toBe(400);
  });
});

describe("documents", () => {
  it("POST /api/ingest works with Chroma (no Pinecone gate) and stores counts", async () => {
    ingestData.mockResolvedValue({ chunkCount: 3, pageCount: 1 });
    const form = new FormData();
    form.append("file", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), "test.pdf");

    const res = await fetch(`${baseUrl}/api/ingest`, { method: "POST", body: form });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ ok: true, chunkCount: 3, pageCount: 1 });
    expect(getDocument(data.documentId)).toMatchObject({ fileName: "test.pdf", chunkCount: 3 });
  });

  it("DELETE removes vectors and the row", async () => {
    addDocument("doc-1", { fileName: "a.pdf", size: 10, chunkCount: 4, pageCount: 2 });
    deleteDocumentVectors.mockResolvedValue(true);

    const res = await fetch(`${baseUrl}/api/documents/doc-1`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(deleteDocumentVectors).toHaveBeenCalledWith({
      documentId: "doc-1",
      chunkCount: 4,
      fileName: "a.pdf",
    });
    expect(getDocument("doc-1")).toBeNull();
  });

  it("DELETE keeps the row when the vector store fails", async () => {
    addDocument("doc-1", { fileName: "a.pdf", size: 10, chunkCount: 4, pageCount: 2 });
    deleteDocumentVectors.mockRejectedValue(new Error("down"));

    const res = await fetch(`${baseUrl}/api/documents/doc-1`, { method: "DELETE" });
    expect(res.status).toBe(503);
    expect(getDocument("doc-1")).not.toBeNull();
  });

  it("DELETE unknown document is 404", async () => {
    const res = await fetch(`${baseUrl}/api/documents/nope`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("memories API", () => {
  it("supports create, list, delete", async () => {
    const created = await post("/api/memories", { content: "Likes tea", category: "preference" });
    expect(created.status).toBe(201);
    const { memory } = await created.json();

    let list = await (await fetch(`${baseUrl}/api/memories`)).json();
    expect(list.count).toBe(1);
    expect(list.memories[0].content).toBe("Likes tea");

    const del = await fetch(`${baseUrl}/api/memories/${memory.id}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    list = await (await fetch(`${baseUrl}/api/memories`)).json();
    expect(list.count).toBe(0);
  });

  it("rejects an empty memory", async () => {
    expect((await post("/api/memories", {})).status).toBe(400);
  });

  it("clears all memories", async () => {
    await post("/api/memories", { content: "A" });
    await post("/api/memories", { content: "B" });
    const res = await fetch(`${baseUrl}/api/memories`, { method: "DELETE" });
    expect((await res.json()).deleted).toBe(2);
  });
});
