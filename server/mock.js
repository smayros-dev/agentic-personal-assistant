/**
 * Deterministic stand-ins for the LLM and the embedding model, enabled with
 * LLM_PROVIDER=mock. They let E2E tests exercise the real agent loop, tools,
 * SSE streaming and persistence without Ollama. Never used by default.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";

export const MOCK_MODEL = "mock-llm";

export const isMockMode = () => (process.env.LLM_PROVIDER || "").toLowerCase() === "mock";

const textOf = (content) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((p) => (typeof p === "string" ? p : p?.text || "")).join("")
      : "";

const MEMORY_PATTERN =
  /\b(my name is|i am|i'm|i work|i live|i like|i love|i prefer|remember that)\b/i;
const ARITHMETIC_PATTERN = /(-?\d+(?:\.\d+)?\s*[-+*/^%]\s*)+-?\d+(?:\.\d+)?/;

/**
 * Decides the next assistant turn from the conversation, like a (very simple)
 * tool-calling model would: call one tool for a new user message, then answer
 * from the tool result.
 * @returns {{ content: string, toolCall?: { name: string, args: Object } }}
 */
export function decideMockTurn(messages) {
  const last = messages[messages.length - 1];
  const type = last?._getType?.() ?? last?.type;

  if (type === "tool") {
    const result = textOf(last.content);
    if (last.name === "save_memory") return { content: `Got it. ${result}` };
    if (last.name === "calculator") return { content: `The result is ${result}.` };
    // Search results start with "[n] Source: file, Page p" then the passage
    const match = result.match(/^\[(\d+)\] Source: [^\n]*\n([\s\S]*?)(?:\n\n---|$)/);
    if (match) {
      const passage = match[2].replace(/\s+/g, " ").trim().slice(0, 300);
      return { content: `According to your documents: ${passage} [${match[1]}]` };
    }
    return { content: `I could not find anything relevant in your documents. (${result})` };
  }

  const question = textOf(last?.content).trim();
  if (MEMORY_PATTERN.test(question)) {
    return {
      content: "",
      toolCall: {
        name: "save_memory",
        args: { content: `The user said: ${question}`.slice(0, 300), category: "fact" },
      },
    };
  }
  const expression = question.match(ARITHMETIC_PATTERN)?.[0];
  if (expression) {
    return { content: "", toolCall: { name: "calculator", args: { expression } } };
  }
  return { content: "", toolCall: { name: "search_knowledge_base", args: { query: question } } };
}

let toolCallCounter = 0;

/** Fake tool-calling chat model driven by decideMockTurn. */
export class MockChatModel extends BaseChatModel {
  _llmType() {
    return "mock";
  }

  // Tool choice is rule-based, so bound tools only need to be accepted.
  bindTools() {
    return this;
  }

  async _generate(messages) {
    const { content, toolCall } = decideMockTurn(messages);
    const tool_calls = toolCall
      ? [{ ...toolCall, id: `mock-call-${++toolCallCounter}`, type: "tool_call" }]
      : [];
    return { generations: [{ text: content, message: new AIMessage({ content, tool_calls }) }] };
  }

  async *_streamResponseChunks(messages, options, runManager) {
    const { content, toolCall } = decideMockTurn(messages);
    if (toolCall) {
      yield new ChatGenerationChunk({
        text: "",
        message: new AIMessageChunk({
          content: "",
          tool_call_chunks: [
            {
              name: toolCall.name,
              args: JSON.stringify(toolCall.args),
              id: `mock-call-${++toolCallCounter}`,
              index: 0,
              type: "tool_call_chunk",
            },
          ],
        }),
      });
      return;
    }
    // Stream word by word so clients see several token events
    for (const word of content.match(/\S+\s*/g) || []) {
      if (options?.signal?.aborted) break;
      const chunk = new ChatGenerationChunk({ text: word, message: new AIMessageChunk(word) });
      yield chunk;
      await runManager?.handleLLMNewToken(word, undefined, undefined, undefined, undefined, {
        chunk,
      });
    }
  }
}

const EMBEDDING_DIMENSIONS = 256;

/** Bag-of-words hashing embeddings: deterministic, and similar texts score close. */
export class MockEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  embed(text) {
    const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    for (const word of String(text)
      .toLowerCase()
      .match(/[a-z0-9]+/g) || []) {
      let hash = 0;
      for (const ch of word) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      vector[hash % EMBEDDING_DIMENSIONS] += 1;
    }
    // Never all zeros: cosine distance is undefined for a null vector
    if (vector.every((v) => v === 0)) vector[0] = 1;
    const norm = Math.hypot(...vector);
    return vector.map((v) => v / norm);
  }

  async embedDocuments(texts) {
    return texts.map((t) => this.embed(t));
  }

  async embedQuery(text) {
    return this.embed(text);
  }
}
