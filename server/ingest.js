import path from "node:path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Loads a PDF, splits it into chunks, and upserts the chunks into Pinecone.
 * @param {string} filePath - Path to the temporary uploaded PDF file.
 * @param {string} [originalName] - Original filename supplied by the uploader,
 *   stored as chunk metadata so ingested content stays traceable to its source.
 */
export const ingestData = async (filePath, originalName) => {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY. Set it in server/.env to enable ingestion.");
  }
  if (!indexName) {
    throw new Error("Missing PINECONE_INDEX. Set it in server/.env to enable ingestion.");
  }

  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(docs);

  const sourceName = originalName || path.basename(filePath);
  const ingestedAt = new Date().toISOString();
  chunks.forEach((chunk) => {
    chunk.metadata = { ...chunk.metadata, source: sourceName, ingestedAt };
  });

  const pc = new Pinecone({ apiKey });
  const index = pc.Index(indexName);

  const embeddings = new PineconeEmbeddings({ model: "llama-text-embed-v2" });
  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  const BATCH_SIZE = 96;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await store.addDocuments(batch);
  }
  console.log(`✅ Ingestion Complete! (${chunks.length} chunks from ${sourceName})`);
};
