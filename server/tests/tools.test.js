import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../vectorstore.js", () => ({
  searchVectorStore: vi.fn(),
  getDocumentChunks: vi.fn(),
}));

const { createTools, createRunContext, safeCalculate, addCitation, SEARCH_BUDGET } =
  await import("../tools.js");
const { searchVectorStore, getDocumentChunks } = await import("../vectorstore.js");
const { addDocument } = await import("../documents.js");
const { resetDatabaseForTests } = await import("../db.js");

const docs = [
  {
    pageContent: "Alpha text",
    metadata: { source: "a.pdf", page: 2, documentId: "doc-1", score: 0.1 },
  },
  {
    pageContent: "Beta text",
    metadata: { source: "a.pdf", page: 2, documentId: "doc-1", score: 0.2 },
  },
];

const getTool = (ctx, name) => createTools(ctx).find((t) => t.name === name);

beforeEach(() => {
  resetDatabaseForTests();
  vi.clearAllMocks();
});

describe("search_knowledge_base", () => {
  it("formats results with citation markers and dedupes citations", async () => {
    searchVectorStore.mockResolvedValue(docs);
    const ctx = createRunContext();
    const out = await getTool(ctx, "search_knowledge_base").invoke({ query: "x" });

    expect(out).toContain("[1] Source: a.pdf, Page 2");
    expect(ctx.citations).toHaveLength(1);
    expect(ctx.citations[0]).toMatchObject({
      id: 1,
      source: "a.pdf",
      page: 2,
      documentId: "doc-1",
    });
  });

  it("enforces the search budget", async () => {
    searchVectorStore.mockResolvedValue(docs);
    const ctx = createRunContext();
    const search = getTool(ctx, "search_knowledge_base");
    for (let i = 0; i < SEARCH_BUDGET; i++) await search.invoke({ query: "x" });
    const out = await search.invoke({ query: "x" });

    expect(out).toMatch(/budget exhausted/i);
    expect(searchVectorStore).toHaveBeenCalledTimes(SEARCH_BUDGET);
  });

  it("applies the document filter from the context", async () => {
    searchVectorStore.mockResolvedValue([]);
    const ctx = createRunContext({ documentId: "doc-1" });
    const out = await getTool(ctx, "search_knowledge_base").invoke({ query: "x" });

    expect(out).toMatch(/No relevant information/);
    expect(searchVectorStore).toHaveBeenCalledWith("x", 5, { documentId: "doc-1" });
  });
});

describe("document tools", () => {
  it("list_documents includes uploaded documents", async () => {
    addDocument("doc-9", { fileName: "report.pdf", size: 1, pageCount: 3, chunkCount: 7 });
    const out = await getTool(createRunContext(), "list_documents").invoke({});
    expect(out).toContain("report.pdf (id: doc-9, 3 pages, 7 chunks");
  });

  it("summarize_document returns excerpts and records citations", async () => {
    addDocument("doc-9", { fileName: "report.pdf", size: 1, pageCount: 3, chunkCount: 7 });
    getDocumentChunks.mockResolvedValue([
      { pageContent: "Intro", metadata: { source: "report.pdf", page: 1 } },
    ]);
    const ctx = createRunContext();
    const out = await getTool(ctx, "summarize_document").invoke({ documentId: "doc-9" });
    expect(out).toContain("[1] Page 1: Intro");
    expect(ctx.citations).toHaveLength(1);
  });

  it("summarize_document rejects unknown ids", async () => {
    const out = await getTool(createRunContext(), "summarize_document").invoke({ documentId: "x" });
    expect(out).toMatch(/Unknown documentId/);
  });
});

describe("calculator", () => {
  it("evaluates arithmetic", () => {
    expect(safeCalculate("2^10 + 1")).toBe(1025);
    expect(safeCalculate("(12.5 * 4) / 2")).toBe(25);
  });

  it("rejects non-arithmetic input", () => {
    expect(() => safeCalculate("process.exit()")).toThrow("Invalid expression");
    expect(() => safeCalculate("1/0")).toThrow("Invalid expression");
  });

  it("tool returns a friendly message on bad input", async () => {
    const out = await getTool(createRunContext(), "calculator").invoke({ expression: "alert(1)" });
    expect(out).toMatch(/Invalid expression/);
  });
});

describe("memory tools", () => {
  it("save_memory dedupes and is rate-limited per run", async () => {
    const ctx = createRunContext({ sessionId: "s1" });
    const save = getTool(ctx, "save_memory");

    expect(await save.invoke({ content: "Likes green tea" })).toBe("Saved memory: Likes green tea");
    expect(await save.invoke({ content: "likes green tea" })).toMatch(/^Already known/);
    await save.invoke({ content: "Works as a nurse" });
    expect(await save.invoke({ content: "Lives in Tunis" })).toMatch(/limit reached/);
  });

  it("recall_memories finds saved content", async () => {
    const ctx = createRunContext();
    await getTool(ctx, "save_memory").invoke({
      content: "Likes green tea",
      category: "preference",
    });
    const out = await getTool(ctx, "recall_memories").invoke({ query: "tea" });
    expect(out).toContain("(preference");
    expect(out).toContain("Likes green tea");
  });
});

describe("addCitation", () => {
  it("handles missing page and metadata", () => {
    const ctx = createRunContext();
    const c = addCitation(ctx, { pageContent: "  a\n b ", metadata: {} });
    expect(c).toMatchObject({ id: 1, source: "Unknown", page: null, snippet: "a b" });
  });
});
