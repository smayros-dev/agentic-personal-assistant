import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";

vi.mock("../vectorstore.js", () => ({
  searchVectorStore: vi.fn(),
  getDocumentChunks: vi.fn(),
}));

const { searchVectorStore } = await import("../vectorstore.js");
const { decideMockTurn, MockEmbeddings, MOCK_MODEL, isMockMode } = await import("../mock.js");
const { runAgent, listOllamaModels } = await import("../agent.js");
const { listMemories } = await import("../memories.js");
const { resetDatabaseForTests } = await import("../db.js");

const cosine = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

describe("decideMockTurn", () => {
  it("searches the knowledge base for a plain question", () => {
    const turn = decideMockTurn([new HumanMessage("What is the codename?")]);
    expect(turn.toolCall).toEqual({
      name: "search_knowledge_base",
      args: { query: "What is the codename?" },
    });
  });

  it("saves durable facts and computes arithmetic", () => {
    expect(decideMockTurn([new HumanMessage("My name is Ada")]).toolCall.name).toBe("save_memory");
    expect(decideMockTurn([new HumanMessage("what is 12 * 4?")]).toolCall).toEqual({
      name: "calculator",
      args: { expression: "12 * 4" },
    });
  });

  it("answers from the first search passage with its citation marker", () => {
    const result = "[1] Source: a.pdf, Page 2\nThe codename is BLUEFIN-42.\n\n---\n\n[2] ...";
    const turn = decideMockTurn([
      new HumanMessage("q"),
      new ToolMessage({ content: result, tool_call_id: "1", name: "search_knowledge_base" }),
    ]);
    expect(turn).toEqual({
      content: "According to your documents: The codename is BLUEFIN-42. [1]",
    });
  });
});

describe("MockEmbeddings", () => {
  it("is deterministic, normalized and ranks overlapping text higher", async () => {
    const e = new MockEmbeddings();
    const [doc, other] = await e.embedDocuments(["the codename is bluefin", "pasta recipes"]);
    const query = await e.embedQuery("what is the codename");
    expect(await e.embedQuery("what is the codename")).toEqual(query);
    expect(cosine(doc, doc)).toBeCloseTo(1);
    expect(cosine(query, doc)).toBeGreaterThan(cosine(query, other));
    expect((await e.embedQuery("")).some((v) => v !== 0)).toBe(true);
  });
});

describe("runAgent with LLM_PROVIDER=mock", () => {
  let previous;
  beforeAll(() => {
    previous = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "mock";
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = previous;
  });
  beforeEach(() => {
    resetDatabaseForTests();
    vi.clearAllMocks();
  });

  it("lists the mock model", async () => {
    expect(isMockMode()).toBe(true);
    expect(await listOllamaModels()).toEqual([MOCK_MODEL]);
  });

  it("runs a real tool call and streams an answer with citations", async () => {
    searchVectorStore.mockResolvedValue([
      {
        pageContent: "The project codename is BLUEFIN-42.",
        metadata: { source: "brief.pdf", page: 1, documentId: "doc-1", score: 0.1 },
      },
    ]);
    const events = [];
    const result = await runAgent({
      message: "What is the codename?",
      model: "anything",
      onEvent: (e) => events.push(e),
    });

    expect(result.output).toBe(
      "According to your documents: The project codename is BLUEFIN-42. [1]"
    );
    expect(result.citations).toEqual([expect.objectContaining({ source: "brief.pdf", page: 1 })]);
    expect(result.steps).toEqual([
      expect.objectContaining({
        name: "search_knowledge_base",
        args: { query: "What is the codename?" },
      }),
    ]);
    const types = events.map((e) => e.type);
    expect(types.indexOf("tool_call")).toBeLessThan(types.indexOf("tool_result"));
    expect(types.filter((t) => t === "token").length).toBeGreaterThan(1);
    expect(
      events
        .filter((e) => e.type === "token")
        .map((e) => e.text)
        .join("")
    ).toBe(result.output);
  });

  it("persists a durable fact through save_memory", async () => {
    const result = await runAgent({ message: "My name is Ada and I work as a pilot" });
    expect(result.steps[0].name).toBe("save_memory");
    expect(result.output).toMatch(/^Got it\. Saved memory:/);
    expect(listMemories().map((m) => m.content)).toEqual([
      "The user said: My name is Ada and I work as a pilot",
    ]);
    expect(searchVectorStore).not.toHaveBeenCalled();
  });
});
