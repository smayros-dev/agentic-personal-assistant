import { ChatOllama } from "@langchain/ollama";
import { createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { searchKnowledgeBase } from "./tools.js";
import { searchVectorStore } from "./vectorstore.js";

// Create a memory saver for persisting conversation history. Shared across
// all models so switching models mid-conversation keeps the same history.
const checkpointer = new MemorySaver();

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3.6:latest";

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a knowledge base.
         Call search_knowledge_base at most twice per question. If it returns "No relevant information found",
         do NOT call it again - answer from general knowledge and mention the knowledge base had nothing relevant.
         Be concise and accurate.`;

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

// Model clients are cached per model name (switching models from the UI
// shouldn't pay the instantiation cost on every request). The agent graph is
// built per request so each conversation gets its own search budget.
const modelsByName = new Map();

const getModel = (modelName) => {
  if (modelsByName.has(modelName)) return modelsByName.get(modelName);

  const model = new ChatOllama({
    model: modelName,
    baseUrl: OLLAMA_BASE_URL,
    temperature: 0,
    think: false,
  });

  modelsByName.set(modelName, model);
  return model;
};

// Caps knowledge-base searches per request: some models keep re-querying even
// after a successful result or an explicit "no results", burning the recursion
// budget until the request fails.
const SEARCH_BUDGET = 2;

const getAgent = (modelName, searchCalls) => {
  const boundedSearch = tool(
    async ({ query }) => {
      if (searchCalls.count >= SEARCH_BUDGET) {
        return "Search budget exhausted. Answer now with what you already know and do NOT search again.";
      }
      searchCalls.count += 1;
      return searchKnowledgeBase.invoke({ query });
    },
    {
      name: searchKnowledgeBase.name,
      description: searchKnowledgeBase.description,
      schema: searchKnowledgeBase.schema,
    }
  );

  return createAgent({
    model: getModel(modelName),
    tools: [boundedSearch],
    checkpointer,
    systemPrompt: SYSTEM_PROMPT,
  });
};

/** Fetches the list of models currently installed/pulled in the local Ollama instance. */
export async function listOllamaModels() {
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

export async function runAgent({ sessionId = "default", message, model }) {
  const modelName = model || DEFAULT_MODEL;

  try {
    console.log(`🤖 Running agent (model: ${modelName}) for: "${message}"`);

    const searchCalls = { count: 0 };
    const agent = getAgent(modelName, searchCalls);

    // Invoke here has an agentic behavior and it will decide to use the tool or not.
    const response = await agent.invoke(
      {
        messages: [{ role: "user", content: message }],
      },
      {
        configurable: {
          thread_id: sessionId, // This maintains conversation history per session
        },
        recursionLimit: 12, // Small bound: some models loop on tool calls instead of answering
      }
    );

    // Extract the last message content
    const lastMessage = response.messages[response.messages.length - 1];
    const output = lastMessage?.content || "";

    console.log(`✅ Agent response: ${output.slice(0, 100)}...`);

    return { output };
  } catch (error) {
    console.error("❌ Error in runAgent:", error);
    if (isConnectionError(error)) {
      throw new LLMUnavailableError(error);
    }
    // Retry once without the agent loop: covers models that re-issue tool
    // calls forever (GraphRecursionError) and transient agent failures.
    try {
      return { output: await singleShotAnswer({ message, modelName }) };
    } catch {
      throw error;
    }
  }
}

/** One-shot answer without tools, used when the agent loop cannot terminate. */
async function singleShotAnswer({ message, modelName }) {
  let context = "";
  try {
    const docs = await searchVectorStore(message, 5);
    context = docs
      .map((d) => {
        const source = d.metadata?.source || "Unknown";
        const page = d.metadata?.page || "N/A";
        return `[Source: ${source}, Page ${page}]\n${d.pageContent}`;
      })
      .join("\n\n---\n\n");
  } catch (searchError) {
    console.error("⚠️ Fallback search failed:", searchError.message);
  }

  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\nKnowledge base context:\n${context}`
    : SYSTEM_PROMPT;

  const response = await getModel(modelName).invoke([
    { role: "system", content: systemContent },
    { role: "user", content: message },
  ]);

  const output = String(response.content || "").trim();
  if (!output) {
    throw new Error("Empty response from model");
  }
  console.log(`✅ Fallback response: ${output.slice(0, 100)}...`);
  return output;
}
