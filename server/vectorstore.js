/**
 * Vector Store Abstraction Layer
 * Supports: Pinecone (cloud) or Chroma (local)
 * Switch via VECTOR_DB env var: "pinecone" | "chroma"
 */

import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { isMockMode, MockEmbeddings } from "./mock.js";

const VECTOR_DB = process.env.VECTOR_DB || "chroma"; // Default to chroma (local)
const BATCH_SIZE = 96;

let vectorStoreInstance = null;
let embeddingsInstance = null;

/** Thrown when the selected vector store is missing required configuration. */
export class VectorStoreConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "VectorStoreConfigError";
  }
}

/** Deterministic chunk ids so a document's vectors can be deleted later. */
export const chunkId = (documentId, index) => `${documentId}:${index}`;

/**
 * Throws a VectorStoreConfigError if the configured provider can't be used.
 */
export function assertVectorStoreConfigured() {
  if (VECTOR_DB === "pinecone") {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey || apiKey === "pcsk_zzzzz") {
      throw new VectorStoreConfigError(
        "Pinecone not configured. Set PINECONE_API_KEY in server/.env or switch to Chroma: VECTOR_DB=chroma"
      );
    }
    if (!process.env.PINECONE_INDEX) {
      throw new VectorStoreConfigError("Missing PINECONE_INDEX in server/.env");
    }
  } else if (VECTOR_DB === "chroma") {
    if (!process.env.CHROMA_URL) {
      throw new VectorStoreConfigError(
        "Missing CHROMA_URL. Set it in server/.env (e.g., http://localhost:8000)"
      );
    }
    if (!process.env.CHROMA_COLLECTION) {
      throw new VectorStoreConfigError("Missing CHROMA_COLLECTION in server/.env");
    }
  } else {
    throw new VectorStoreConfigError(`Unknown VECTOR_DB: ${VECTOR_DB}. Use "pinecone" or "chroma"`);
  }
}

/**
 * Initialize the appropriate embeddings model based on VECTOR_DB setting
 */
function getEmbeddings() {
  if (embeddingsInstance) return embeddingsInstance;

  if (isMockMode()) {
    console.log("🧪 Using mock embeddings (LLM_PROVIDER=mock)");
    embeddingsInstance = new MockEmbeddings();
  } else if (VECTOR_DB === "pinecone") {
    console.log("🔌 Initializing Pinecone Embeddings...");
    embeddingsInstance = new PineconeEmbeddings({
      model: "llama-text-embed-v2",
    });
  } else {
    console.log("🧠 Initializing Ollama Embeddings (local)...");
    embeddingsInstance = new OllamaEmbeddings({
      model: process.env.EMBEDDING_MODEL || "nomic-embed-text",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });
  }

  return embeddingsInstance;
}

/**
 * Returns the single cached vector store instance (creates/connects on first use).
 */
export async function getStore() {
  if (vectorStoreInstance) return vectorStoreInstance;

  assertVectorStoreConfigured();
  console.log(`\n📦 Initializing Vector Store: ${VECTOR_DB.toUpperCase()}`);
  const embeddings = getEmbeddings();

  if (VECTOR_DB === "pinecone") {
    const pc = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
    vectorStoreInstance = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: pc.Index(process.env.PINECONE_INDEX),
    });
  } else {
    console.log(`   URL: ${process.env.CHROMA_URL}`);
    console.log(`   Collection: ${process.env.CHROMA_COLLECTION}`);
    // The collection is created lazily (getOrCreate) on first use.
    vectorStoreInstance = new Chroma(embeddings, {
      collectionName: process.env.CHROMA_COLLECTION,
      url: process.env.CHROMA_URL,
      collectionMetadata: { "hnsw:space": "cosine" },
    });
  }

  console.log(`✓ Vector Store ready!\n`);
  return vectorStoreInstance;
}

/**
 * Add documents to vector store (for ingestion)
 * @param {import("@langchain/core/documents").Document[]} chunks
 * @param {{ ids?: string[] }} [options]
 */
export async function addDocuments(chunks, { ids } = {}) {
  const store = await getStore();

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await store.addDocuments(batch, ids ? { ids: ids.slice(i, i + BATCH_SIZE) } : undefined);
  }

  console.log(`✓ Added ${chunks.length} documents to ${VECTOR_DB}`);
}

/**
 * Search vector store
 * @param {string} query
 * @param {number} [topK]
 * @param {{ documentId?: string }} [filter] - metadata equality filter
 * @returns {Promise<import("@langchain/core/documents").Document[]>} docs with metadata.score
 */
export async function searchVectorStore(query, topK = 5, filter) {
  const store = await getStore();

  console.log(`🔍 Searching ${VECTOR_DB.toUpperCase()} for: "${query}"`);

  const scored = await store.similaritySearchWithScore(query, topK, filter);

  if (scored.length === 0) {
    console.log("⚠️  No results found");
    return [];
  }

  console.log(`✓ Found ${scored.length} matching chunks`);

  return scored.map(([doc, score], i) => {
    const source = doc.metadata?.source || "Unknown";
    const preview = doc.pageContent.slice(0, 120).replace(/\n/g, " ");
    console.log(`  [${i + 1}] ${source}: ${preview}...`);
    doc.metadata = { ...doc.metadata, score };
    return doc;
  });
}

/**
 * Removes a document's vectors.
 * Documents ingested with deterministic ids are deleted by id; legacy documents
 * (chunkCount 0) are deleted by source filename where the provider supports it.
 * @returns {Promise<boolean>} true when a delete was issued
 */
export async function deleteDocumentVectors({ documentId, chunkCount, fileName }) {
  const store = await getStore();

  if (chunkCount > 0) {
    const ids = Array.from({ length: chunkCount }, (_, i) => chunkId(documentId, i));
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      await store.delete({ ids: ids.slice(i, i + BATCH_SIZE) });
    }
    return true;
  }

  if (VECTOR_DB === "chroma" && fileName) {
    await store.delete({ filter: { source: fileName } });
    return true;
  }

  console.warn(`⚠️ Cannot delete vectors for legacy document ${documentId} on ${VECTOR_DB}`);
  return false;
}

/**
 * Returns up to `limit` chunks of a document, ordered by page.
 */
export async function getDocumentChunks(documentId, limit = 12) {
  if (VECTOR_DB === "chroma") {
    const store = await getStore();
    const collection = await store.ensureCollection();
    const result = await collection.get({
      where: { documentId },
      limit,
      include: ["documents", "metadatas"],
    });
    return (result.documents || [])
      .map((pageContent, i) => ({
        pageContent: pageContent || "",
        metadata: result.metadatas[i] || {},
      }))
      .sort(
        (a, b) =>
          (a.metadata.chunkIndex ?? a.metadata.page ?? 0) -
          (b.metadata.chunkIndex ?? b.metadata.page ?? 0)
      );
  }

  return searchVectorStore("overview summary introduction", limit, { documentId });
}

/**
 * Get current vector store configuration
 */
export function getVectorStoreConfig() {
  return {
    provider: VECTOR_DB,
    pinecone:
      VECTOR_DB === "pinecone"
        ? {
            apiKey: process.env.PINECONE_API_KEY ? "***" : "NOT SET",
            index: process.env.PINECONE_INDEX || "NOT SET",
          }
        : null,
    chroma:
      VECTOR_DB === "chroma"
        ? {
            url: process.env.CHROMA_URL || "NOT SET",
            collection: process.env.CHROMA_COLLECTION || "NOT SET",
            embeddingModel: isMockMode()
              ? "mock"
              : process.env.EMBEDDING_MODEL || "nomic-embed-text",
            ollamaUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
          }
        : null,
  };
}
