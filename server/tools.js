import { tool } from "langchain";
import { z } from "zod";
import { searchVectorStore, getDocumentChunks } from "./vectorstore.js";
import { listDocumentsBrief, getDocument } from "./documents.js";
import { addMemory, searchMemories, MEMORY_CATEGORIES } from "./memories.js";

// Caps knowledge-base searches per request: some models keep re-querying even
// after a successful result or an explicit "no results", burning the recursion
// budget until the request fails.
export const SEARCH_BUDGET = 2;
export const MEMORY_SAVE_BUDGET = 3;
const SUMMARY_CHAR_LIMIT = 6000;

/**
 * Creates the per-request run context shared by the tools.
 * Tools record citations/steps here so the API can return them.
 */
export function createRunContext({ sessionId = null, documentId = null } = {}) {
  return { sessionId, documentId, citations: [], steps: [], searchCalls: 0, memorySaves: 0 };
}

/**
 * Records a retrieved chunk as a citation (deduplicated by source + page).
 * @returns {{ id, source, page, documentId, snippet, score }}
 */
export function addCitation(ctx, doc) {
  const source = doc.metadata?.source || "Unknown";
  const page = typeof doc.metadata?.page === "number" ? doc.metadata.page : null;
  const existing = ctx.citations.find((c) => c.source === source && c.page === page);
  if (existing) return existing;

  const citation = {
    id: ctx.citations.length + 1,
    source,
    page,
    documentId: doc.metadata?.documentId ?? null,
    snippet: String(doc.pageContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200),
    score: typeof doc.metadata?.score === "number" ? doc.metadata.score : null,
  };
  ctx.citations.push(citation);
  return citation;
}

/** Formats retrieved chunks with [n] markers matching the recorded citations. */
export function formatSearchResults(ctx, docs) {
  return docs
    .map((doc) => {
      const c = addCitation(ctx, doc);
      return `[${c.id}] Source: ${c.source}, Page ${c.page ?? "?"}\n${doc.pageContent}`;
    })
    .join("\n\n---\n\n");
}

/** Evaluates a plain arithmetic expression; rejects anything else. */
export function safeCalculate(expression) {
  const expr = String(expression ?? "").trim();
  if (!expr || expr.length > 200 || !/^[0-9+\-*/().\s%^]+$/.test(expr)) {
    throw new Error("Invalid expression");
  }
  const result = new Function(`return (${expr.replace(/\^/g, "**")});`)();
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }
  return result;
}

/**
 * Builds the agent's toolset bound to one request's context.
 * @param {ReturnType<typeof createRunContext>} ctx
 */
export function createTools(ctx) {
  const searchKnowledgeBase = tool(
    async ({ query, documentId }) => {
      if (ctx.searchCalls >= SEARCH_BUDGET) {
        return "Search budget exhausted. Answer now with what you already know and do NOT search again.";
      }
      ctx.searchCalls += 1;

      const scope = documentId || ctx.documentId;
      try {
        const results = await searchVectorStore(
          query,
          5,
          scope ? { documentId: scope } : undefined
        );
        if (results.length === 0) {
          return "No relevant information found in the knowledge base.";
        }
        return formatSearchResults(ctx, results);
      } catch (error) {
        console.error("❌ Search error:", error.message);
        throw new Error(`Failed to search knowledge base: ${error.message}`);
      }
    },
    {
      name: "search_knowledge_base",
      description:
        "Searches the uploaded PDF documents for relevant passages. Returns chunks prefixed with a [n] citation marker. Optionally restrict to one document id (see list_documents).",
      schema: z.object({
        query: z.string().describe("The search query to look up in the knowledge base"),
        documentId: z
          .string()
          .optional()
          .describe("Optional document id to restrict the search to"),
      }),
    }
  );

  const listDocuments = tool(
    async () => {
      const docs = listDocumentsBrief();
      if (docs.length === 0) return "No documents have been uploaded.";
      return docs
        .map(
          (d) =>
            `- ${d.fileName} (id: ${d.id}, ${d.pageCount} pages, ${d.chunkCount} chunks, uploaded ${d.uploadedAt})`
        )
        .join("\n");
    },
    {
      name: "list_documents",
      description: "Lists the documents uploaded to the knowledge base with their ids.",
      schema: z.object({}),
    }
  );

  const summarizeDocument = tool(
    async ({ documentId }) => {
      const doc = getDocument(documentId);
      if (!doc) return `Unknown documentId: ${documentId}. Use list_documents to find valid ids.`;

      const chunks = await getDocumentChunks(documentId, 12);
      if (chunks.length === 0) return `No content found for ${doc.fileName}.`;

      let text = "";
      for (const chunk of chunks) {
        const c = addCitation(ctx, chunk);
        const block = `[${c.id}] Page ${c.page ?? "?"}: ${chunk.pageContent}\n\n`;
        if (text.length + block.length > SUMMARY_CHAR_LIMIT) break;
        text += block;
      }
      return `Summarize the following excerpts of "${doc.fileName}":\n\n${text}`;
    },
    {
      name: "summarize_document",
      description:
        "Fetches representative excerpts of one uploaded document so you can summarize it. Requires a document id from list_documents.",
      schema: z.object({ documentId: z.string().describe("The document id") }),
    }
  );

  const getCurrentDatetime = tool(
    async () => {
      const now = new Date();
      const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
      return `ISO: ${now.toISOString()} | Local: ${now.toLocaleString()} | ${weekday}`;
    },
    {
      name: "get_current_datetime",
      description: "Returns the current date, time and weekday.",
      schema: z.object({}),
    }
  );

  const calculator = tool(
    async ({ expression }) => {
      try {
        return `${expression} = ${safeCalculate(expression)}`;
      } catch {
        return "Invalid expression. Use only numbers and + - * / % ^ ( ).";
      }
    },
    {
      name: "calculator",
      description: "Evaluates an arithmetic expression, e.g. (12.5 * 4) / 3 or 2^10.",
      schema: z.object({ expression: z.string().describe("Arithmetic expression") }),
    }
  );

  const saveMemory = tool(
    async ({ content, category }) => {
      if (ctx.memorySaves >= MEMORY_SAVE_BUDGET) {
        return "Memory save limit reached for this message.";
      }
      ctx.memorySaves += 1;
      const { memory, created } = addMemory({
        content,
        category,
        sourceSessionId: ctx.sessionId,
      });
      return created ? `Saved memory: ${memory.content}` : `Already known: ${memory.content}`;
    },
    {
      name: "save_memory",
      description:
        "Stores a durable fact or preference the user stated about themselves (name, job, preferences, goals) so it is remembered in future conversations. Never use for questions or temporary details.",
      schema: z.object({
        content: z.string().min(3).max(300).describe("The fact, written in third person"),
        category: z.enum(MEMORY_CATEGORIES).optional(),
      }),
    }
  );

  const recallMemories = tool(
    async ({ query }) => {
      const memories = searchMemories(query, { limit: 10 });
      if (memories.length === 0) return "No stored memories match.";
      return memories
        .map((m) => `- (${m.category}, ${String(m.createdAt).slice(0, 10)}) ${m.content}`)
        .join("\n");
    },
    {
      name: "recall_memories",
      description: "Searches long-term memories about the user by keyword.",
      schema: z.object({ query: z.string().min(1).max(200) }),
    }
  );

  return [
    searchKnowledgeBase,
    listDocuments,
    summarizeDocument,
    getCurrentDatetime,
    calculator,
    saveMemory,
    recallMemories,
  ];
}
