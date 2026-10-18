import { describe, it, expect, beforeEach } from "vitest";
import db, { resetDatabaseForTests } from "../db.js";
import { addDocument, getDocumentStats, deleteDocument } from "../documents.js";
import { saveMessage, getConversation } from "../chatHistory.js";
import {
  addMemory,
  listMemories,
  searchMemories,
  deleteMemory,
  clearMemories,
  countMemories,
} from "../memories.js";
import { prepareChunks } from "../ingest.js";
import { buildSystemPrompt, toHistoryMessages, contentToString } from "../agent.js";
import { formatSseEvent } from "../sse.js";

beforeEach(() => resetDatabaseForTests());

describe("schema migration", () => {
  it("adds the new columns", () => {
    const cols = db
      .prepare("PRAGMA table_info(documents)")
      .all()
      .map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["chunkCount", "source", "mimeType"]));
  });
});

describe("documents", () => {
  it("persists counts and reports stats", () => {
    addDocument("d1", { fileName: "a.pdf", size: 100, pageCount: 2, chunkCount: 5 });
    addDocument("d2", { fileName: "b.pdf", size: 50, pageCount: 1, chunkCount: 3 });
    expect(getDocumentStats()).toEqual({
      totalDocuments: 2,
      totalSize: 150,
      totalChunks: 8,
      totalPages: 3,
    });
  });

  it("deleteDocument returns false for unknown ids", () => {
    expect(deleteDocument("missing")).toBe(false);
  });
});

describe("chat history", () => {
  it("stores and parses message metadata", () => {
    saveMessage("s1", "user", "q", "m");
    saveMessage("s1", "assistant", "a", "m", { citations: [{ id: 1 }], steps: [{ name: "x" }] });
    const rows = getConversation("s1");
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(rows[0].citations).toEqual([]);
    expect(rows[1].citations).toEqual([{ id: 1 }]);
    expect(rows[1].steps).toEqual([{ name: "x" }]);
  });
});

describe("memories", () => {
  it("adds, dedupes, and falls back to the general category", () => {
    const first = addMemory({ content: " Likes tea ", category: "bogus" });
    expect(first.created).toBe(true);
    expect(first.memory).toMatchObject({ content: "Likes tea", category: "general" });
    expect(addMemory({ content: "likes TEA" }).created).toBe(false);
    expect(countMemories()).toBe(1);
  });

  it("validates length", () => {
    expect(() => addMemory({ content: "  " })).toThrow();
    expect(() => addMemory({ content: "x".repeat(501) })).toThrow();
  });

  it("searches by word and lists newest first", () => {
    addMemory({ content: "Likes tea" });
    addMemory({ content: "Drinks coffee daily" });
    addMemory({ content: "Has a dog" });
    expect(searchMemories("tea or coffee?").map((m) => m.content)).toEqual([
      "Drinks coffee daily",
      "Likes tea",
    ]);
    expect(listMemories()[0].content).toBe("Has a dog");
    expect(searchMemories("a").length).toBe(3);
  });

  it("deletes and clears", () => {
    const { memory } = addMemory({ content: "One" });
    addMemory({ content: "Two" });
    expect(deleteMemory("missing")).toBe(false);
    expect(deleteMemory(memory.id)).toBe(true);
    expect(clearMemories()).toBe(1);
  });
});

describe("prepareChunks", () => {
  it("lifts page numbers, drops object metadata, and assigns ids", () => {
    const chunks = [
      {
        pageContent: "a",
        metadata: { loc: { pageNumber: 3, lines: { from: 1, to: 5 } }, pdf: {} },
      },
      { pageContent: "b", metadata: { loc: { pageNumber: 4 }, source: "/tmp/x.pdf" } },
    ];
    const { chunks: out, ids } = prepareChunks(chunks, {
      documentId: "doc-1",
      fileName: "x.pdf",
      ingestedAt: "2026-01-01T00:00:00Z",
    });

    expect(ids).toEqual(["doc-1:0", "doc-1:1"]);
    expect(out[0].metadata).toEqual({
      page: 3,
      source: "x.pdf",
      fileName: "x.pdf",
      documentId: "doc-1",
      chunkIndex: 0,
      ingestedAt: "2026-01-01T00:00:00Z",
    });
    expect(out[1].metadata.source).toBe("x.pdf");
  });
});

describe("agent helpers", () => {
  it("buildSystemPrompt includes memories and document scope", () => {
    const prompt = buildSystemPrompt({
      memories: [{ content: "Likes tea", category: "preference" }],
      documentId: "doc-1",
      now: new Date("2026-10-18T10:00:00Z"),
    });
    expect(prompt).toContain("- (preference) Likes tea");
    expect(prompt).toContain("2026-10-18");
    expect(prompt).toContain("document id doc-1");
    expect(buildSystemPrompt()).toContain("(none yet)");
  });

  it("toHistoryMessages maps roles, drops empty, keeps the last N", () => {
    const rows = [
      { role: "user", content: "1" },
      { role: "assistant", content: "" },
      { role: "assistant", content: "2" },
      { role: "user", content: "3" },
    ];
    expect(toHistoryMessages(rows, { limit: 2 })).toEqual([
      { role: "assistant", content: "2" },
      { role: "user", content: "3" },
    ]);
  });

  it("contentToString flattens content parts", () => {
    expect(contentToString("hi")).toBe("hi");
    expect(contentToString([{ type: "text", text: "a" }, { type: "image_url" }, "b"])).toBe("ab");
    expect(contentToString(undefined)).toBe("");
  });
});

describe("sse", () => {
  it("formats events", () => {
    expect(formatSseEvent({ a: 1 })).toBe('data: {"a":1}\n\n');
  });
});
