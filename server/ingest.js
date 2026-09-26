import path from "node:path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { addDocuments } from "./vectorstore.js";

/**
 * Loads a PDF, splits it into chunks, and stores in configured vector database
 * (Pinecone or Chroma, based on VECTOR_DB env var)
 * @param {string} filePath - Path to the temporary uploaded PDF file.
 * @param {string} [originalName] - Original filename for metadata.
 */
export const ingestData = async (filePath, originalName) => {
  console.log(`\n📄 Loading PDF from: ${filePath}`);
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  console.log(`✓ Extracted ${docs.length} pages`);

  console.log(`✂️  Splitting into chunks...`);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`✓ Created ${chunks.length} chunks`);

  // Add metadata to chunks
  const sourceName = originalName || path.basename(filePath);
  const ingestedAt = new Date().toISOString();
  chunks.forEach((chunk) => {
    chunk.metadata = {
      ...chunk.metadata,
      source: sourceName,
      ingestedAt,
      fileName: sourceName,
    };
  });

  // Store using configured vector database
  console.log(`💾 Storing chunks...`);
  try {
    await addDocuments(chunks);
    console.log(`✅ Ingestion Complete! (${chunks.length} chunks from ${sourceName})\n`);
  } catch (error) {
    console.error("❌ Ingestion error:", error);
    throw new Error(`Failed to ingest documents: ${error.message}`);
  }
};
