import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";
import { createTools, createRunContext, addCitation } from "./tools.js";
import { searchVectorStore } from "./vectorstore.js";
import { listMemories } from "./memories.js";
import { isMockMode, MockChatModel, MOCK_MODEL } from "./mock.js";

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const DEFAULT_MODEL = isMockMode()
  ? MOCK_MODEL
  : process.env.OLLAMA_MODEL || "qwen3.6:latest";

const HISTORY_LIMIT = 20;
const PROMPT_MEMORY_LIMIT = 30;

/** Error thrown when the underlying LLM (Ollama) can't be reached. */
export class LLMUnavailableError extends Error {
  constructor(cause) {
    super("The language model (Ollama) is unavailable. Make sure Ollama is running.");
    this.name = "LLMUnavailableError";
    this.cause = cause;
  }
}

const isConnectionError = (error) =>
  error?.cause?.code === "ECONNREFUSED" ||
  error?.code === "ECONNREFUSED" ||
  /fetch failed|ECONNREFUSED|connect/i.test(error?.message || "");

const isAbortError = (error) => error?.name === "AbortError" || /abort/i.test(error?.message || "");

// Model clients are cached per model name (switching models from the UI
// shouldn't pay the instantiation cost on every request). The agent graph is
// built per request so each conversation gets its own tool context.
const modelsByName = new Map();

const getModel = (modelName) => {
  if (modelsByName.has(modelName)) return modelsByName.get(modelName);

  // LLM_PROVIDER=mock: every model name maps to the deterministic fake model
  const model = isMockMode()
    ? new MockChatModel({})
    : new ChatOllama({
        model: modelName,
        baseUrl: OLLAMA_BASE_URL,
        temperature: 0,
        think: false,
      });

  modelsByName.set(modelName, model);
  return model;
};

/** Flattens LangChain message content (string or content-part array) to text. */
export function contentToString(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
}

/**
 * Builds the system prompt, injecting long-term memories and the current date.
 */
export function buildSystemPrompt({ memories = [], documentId = null, now = new Date() } = {}) {
  const memoryLines = memories.length
    ? memories.map((m) => `- (${m.category}) ${m.content}`).join("\n")
    : "(none yet)";

  return `You are a helpful personal AI assistant with access to the user's uploaded documents and a long-term memory.

Tools policy:
- Use search_knowledge_base for questions about the user's documents. Call it at most twice per question. If it returns "No relevant information found", do NOT call it again - answer from general knowledge and say the documents had nothing relevant.
- Use list_documents to discover document ids, and summarize_document to summarize a whole document.
- Use calculator for arithmetic and get_current_datetime for dates and times.
- Call save_memory ONLY when the user states a durable fact or preference about themselves (name, job, preferences, goals). Never save questions or temporary details.
- The most recent memories are listed below; use recall_memories only for older or specific details.
- When you use document passages, cite them inline as [n] using the markers from the search results.

Be concise and accurate.

Current date: ${now.toISOString().slice(0, 10)}

Known facts about the user:
${memoryLines}${documentId ? `\n\nThe user restricted search to document id ${documentId}.` : ""}`;
}

/**
 * Converts stored conversation rows into chat messages for the model.
 * @param {Array<{role: string, content: string}>} rows
 */
export function toHistoryMessages(rows, { limit = HISTORY_LIMIT } = {}) {
  return rows
    .filter((r) => r.content && String(r.content).trim())
    .map((r) => ({ role: r.role === "assistant" ? "assistant" : "user", content: r.content }))
    .slice(-limit);
}

/** Fetches the list of models currently installed/pulled in the local Ollama instance. */
export async function listOllamaModels() {
  if (isMockMode()) return [MOCK_MODEL];
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch (error) {
    if (isConnectionError(error)) {
      throw new LLMUnavailableError(error);
    }
    throw error;
  }
}

const previewOf = (output) =>
  String(typeof output === "string" ? output : contentToString(output?.content) || "").slice(
    0,
    300
  );

/**
 * Runs the tool-using agent.
 * @param {Object} params
 * @param {string} [params.sessionId]
 * @param {string} params.message
 * @param {string} [params.model]
 * @param {Array<{role, content}>} [params.history] - prior turns (oldest first)
 * @param {string} [params.documentId] - restrict search to one document
 * @param {AbortSignal} [params.signal]
 * @param {(event: Object) => void} [params.onEvent] - receives token/tool_call/tool_result events
 * @returns {Promise<{ output: string, citations: Object[], steps: Object[] }>}
 */
export async function runAgent({
  sessionId = "default",
  message,
  model,
  history = [],
  documentId,
  signal,
  onEvent = () => {},
}) {
  const modelName = model || DEFAULT_MODEL;
  const ctx = createRunContext({ sessionId, documentId });

  try {
    console.log(`🤖 Running agent (model: ${modelName}) for: "${message}"`);

    const agent = createAgent({
      model: getModel(modelName),
      tools: createTools(ctx),
      systemPrompt: buildSystemPrompt({
        memories: listMemories({ limit: PROMPT_MEMORY_LIMIT }),
        documentId,
      }),
    });

    const events = agent.streamEvents(
      { messages: [...history, { role: "user", content: message }] },
      {
        version: "v2",
        recursionLimit: 12, // Small bound: some models loop on tool calls instead of answering
        signal,
      }
    );

    let answer = "";
    let turnText = "";
    const started = new Map();

    for await (const ev of events) {
      switch (ev.event) {
        case "on_chat_model_stream": {
          const text = contentToString(ev.data?.chunk?.content);
          if (text) {
            turnText += text;
            onEvent({ type: "token", text });
          }
          break;
        }
        case "on_chat_model_end": {
          const msg = ev.data?.output;
          const text = contentToString(msg?.content).trim();
          if (!msg?.tool_calls?.length && text) answer = text;
          turnText = "";
          break;
        }
        case "on_tool_start": {
          const input = ev.data?.input;
          const args = input?.args ?? input ?? {};
          started.set(ev.run_id, { name: ev.name, args, startedAt: Date.now() });
          turnText = "";
          onEvent({ type: "tool_call", id: ev.run_id, name: ev.name, args });
          break;
        }
        case "on_tool_end": {
          const start = started.get(ev.run_id) || {
            name: ev.name,
            args: {},
            startedAt: Date.now(),
          };
          const preview = previewOf(ev.data?.output);
          ctx.steps.push({
            id: ev.run_id,
            name: start.name,
            args: start.args,
            resultPreview: preview,
            durationMs: Date.now() - start.startedAt,
          });
          onEvent({ type: "tool_result", id: ev.run_id, name: start.name, preview });
          break;
        }
        default:
          break;
      }
    }

    const output = (answer || turnText).trim();
    if (!output) throw new Error("Empty response from model");

    console.log(`✅ Agent response: ${output.slice(0, 100)}...`);
    return { output, citations: ctx.citations, steps: ctx.steps };
  } catch (error) {
    console.error("❌ Error in runAgent:", error);
    if (isConnectionError(error)) {
      throw new LLMUnavailableError(error);
    }
    if (signal?.aborted || isAbortError(error)) throw error;
    // Retry once without the agent loop: covers models that re-issue tool
    // calls forever (GraphRecursionError) and transient agent failures.
    try {
      const output = await singleShotAnswer({ message, history, modelName, ctx, signal, onEvent });
      return { output, citations: ctx.citations, steps: ctx.steps };
    } catch {
      throw error;
    }
  }
}

/** One-shot RAG answer without tools, used when the agent loop cannot terminate. */
async function singleShotAnswer({ message, history, modelName, ctx, signal, onEvent }) {
  let context = "";
  try {
    const docs = await searchVectorStore(
      message,
      5,
      ctx.documentId ? { documentId: ctx.documentId } : undefined
    );
    context = docs
      .map((d) => {
        const c = addCitation(ctx, d);
        return `[${c.id}] Source: ${c.source}, Page ${c.page ?? "?"}\n${d.pageContent}`;
      })
      .join("\n\n---\n\n");
  } catch (searchError) {
    console.error("⚠️ Fallback search failed:", searchError.message);
  }

  const systemPrompt = buildSystemPrompt({
    memories: listMemories({ limit: PROMPT_MEMORY_LIMIT }),
    documentId: ctx.documentId,
  });
  const systemContent = context
    ? `${systemPrompt}\n\nKnowledge base context:\n${context}`
    : systemPrompt;

  onEvent({ type: "reset" });
  let output = "";
  const stream = await getModel(modelName).stream(
    [{ role: "system", content: systemContent }, ...history, { role: "user", content: message }],
    { signal }
  );
  for await (const chunk of stream) {
    const text = contentToString(chunk.content);
    if (text) {
      output += text;
      onEvent({ type: "token", text });
    }
  }

  output = output.trim();
  if (!output) {
    throw new Error("Empty response from model");
  }
  console.log(`✅ Fallback response: ${output.slice(0, 100)}...`);
  return output;
}
