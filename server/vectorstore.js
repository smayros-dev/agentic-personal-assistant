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

const VECTOR_DB = process.env.VECTOR_DB || "chroma"; // Default to chroma (local)

let vectorStoreInstance = null;
let embeddingsInstance = null;

/**
 * Initialize the appropriate embeddings model based on VECTOR_DB setting
 */
async function getEmbeddings() {
  if (embeddingsInstance) return embeddingsInstance;

  if (VECTOR_DB === "pinecone") {
    console.log("🔌 Initializing Pinecone Embeddings...");
    embeddingsInstance = new PineconeEmbeddings({
      model: "llama-text-embed-v2",
    });
  } else if (VECTOR_DB === "chroma") {
    console.log("🧠 Initializing Ollama Embeddings (local)...");
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const embeddingModel = process.env.EMBEDDING_MODEL || "nomic-embed-text";
    embeddingsInstance = new OllamaEmbeddings({
      model: embeddingModel,
      baseUrl: ollamaUrl,
    });
  } else {
    throw new Error(`Unknown VECTOR_DB: ${VECTOR_DB}. Use "pinecone" or "chroma"`);
  }

  return embeddingsInstance;
}

/**
 * Initialize vector store (creates/connects to existing)
 */
export async function initializeVectorStore() {
  if (vectorStoreInstance) return vectorStoreInstance;

  console.log(`\n📦 Initializing Vector Store: ${VECTOR_DB.toUpperCase()}`);

  if (VECTOR_DB === "pinecone") {
    // Initialize Pinecone
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX;

    if (!apiKey || apiKey === "pcsk_zzzzz") {
      throw new Error(
        "❌ Pinecone not configured. Set PINECONE_API_KEY in server/.env or switch to Chroma: VECTOR_DB=chroma"
      );
    }
    if (!indexName) {
      throw new Error("Missing PINECONE_INDEX in server/.env");
    }

    console.log(`   API Key: ${apiKey.slice(0, 20)}...`);
    console.log(`   Index: ${indexName}`);

    const pc = new PineconeClient({ apiKey });
    const index = pc.Index(indexName);
    const embeddings = await getEmbeddings();

    vectorStoreInstance = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });
  } else if (VECTOR_DB === "chroma") {
    // Initialize Chroma
    const chromaUrl = process.env.CHROMA_URL;
    const collectionName = process.env.CHROMA_COLLECTION;

    if (!chromaUrl) {
      throw new Error(
        "Missing CHROMA_URL. Set it in server/.env (e.g., http://localhost:8000)"
      );
    }
    if (!collectionName) {
      throw new Error("Missing CHROMA_COLLECTION in server/.env");
    }

    console.log(`   URL: ${chromaUrl}`);
    console.log(`   Collection: ${collectionName}`);

    const embeddings = await getEmbeddings();

    vectorStoreInstance = await Chroma.fromExistingCollection(embeddings, {
      collectionName,
      url: chromaUrl,
    });
  }

  console.log(`✓ Vector Store ready!\n`);
  return vectorStoreInstance;
}

/**
 * Add documents to vector store (for ingestion)
 */
export async function addDocuments(chunks) {
  const embeddings = await getEmbeddings();

  if (VECTOR_DB === "pinecone") {
    // Pinecone: use PineconeStore with addDocuments
    const pc = new PineconeClient({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.Index(process.env.PINECONE_INDEX);

    const store = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });

    const BATCH_SIZE = 96;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await store.addDocuments(batch);
    }

    console.log(`✓ Added ${chunks.length} documents to Pinecone`);
  } else if (VECTOR_DB === "chroma") {
    // Chroma: use fromDocuments to add to collection
    const chromaUrl = process.env.CHROMA_URL;
    const collectionName = process.env.CHROMA_COLLECTION;

    await Chroma.fromDocuments(chunks, embeddings, {
      collectionName,
      url: chromaUrl,
      collectionMetadata: {
        "hnsw:space": "cosine",
      },
    });

    console.log(`✓ Added ${chunks.length} documents to Chroma`);
  }
}

/**
 * Search vector store
 */
export async function searchVectorStore(query, topK = 5) {
  const store = await initializeVectorStore();

  console.log(`🔍 Searching ${VECTOR_DB.toUpperCase()} for: "${query}"`);

  const results = await store.similaritySearch(query, topK);

  if (results.length === 0) {
    console.log("⚠️  No results found");
    return [];
  }

  console.log(`✓ Found ${results.length} matching chunks`);

  // Log results for debugging
  results.forEach((r, i) => {
    const source = r.metadata?.source || "Unknown";
    const preview = r.pageContent.slice(0, 120).replace(/\n/g, " ");
    console.log(`  [${i + 1}] ${source}: ${preview}...`);
  });

  return results;
}

/**
 * Get current vector store configuration
 */
export function getVectorStoreConfig() {
  return {
    provider: VECTOR_DB,
    pinecone: VECTOR_DB === "pinecone" ? {
      apiKey: process.env.PINECONE_API_KEY ? "***" : "NOT SET",
      index: process.env.PINECONE_INDEX || "NOT SET",
    } : null,
    chroma: VECTOR_DB === "chroma" ? {
      url: process.env.CHROMA_URL || "NOT SET",
      collection: process.env.CHROMA_COLLECTION || "NOT SET",
      embeddingModel: process.env.EMBEDDING_MODEL || "nomic-embed-text",
      ollamaUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    } : null,
  };
}
