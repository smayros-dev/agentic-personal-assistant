import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { searchKnowledgeBase } from "./tools.js";

// Create a memory saver for persisting conversation history. Shared across
// all models so switching models mid-conversation keeps the same history.
const checkpointer = new MemorySaver();

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3.6:latest";

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a knowledge base. When users ask questions,
         search the knowledge base using the available tools to find relevant information. Be concise and accurate.`;

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

// One agent per model name, created lazily and cached, so switching models
// from the UI doesn't pay the instantiation cost on every request.
const agentsByModel = new Map();

const getAgent = (modelName) => {
  if (agentsByModel.has(modelName)) return agentsByModel.get(modelName);

  const model = new ChatOllama({
    model: modelName,
    baseUrl: OLLAMA_BASE_URL,
    temperature: 0,
    think: false,
  });

  const agent = createAgent({
    model,
    tools: [searchKnowledgeBase],
    checkpointer,
    systemPrompt: SYSTEM_PROMPT,
  });

  agentsByModel.set(modelName, agent);
  return agent;
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

    const agent = getAgent(modelName);

    // Invoke here has an agentic behavior and it will decide to use the tool or not.
    const response = await agent.invoke(
      {
        messages: [{ role: "user", content: message }],
      },
      {
        configurable: {
          thread_id: sessionId, // This maintains conversation history per session
        },
        recursionLimit: 100, // Increased from default 25 to handle complex queries
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
    throw error;
  }
}
