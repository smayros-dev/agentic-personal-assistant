import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { addDocuments, chunkId } from "./vectorstore.js";

const isPrimitive = (value) =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

/**
 * Normalizes chunk metadata for the vector store (Chroma accepts only
 * string/number/boolean values) and assigns deterministic ids.
 * The PDF page number lives in `metadata.loc.pageNumber` and is lifted to `page`.
 */
export function prepareChunks(
  chunks,
  { documentId, fileName, ingestedAt = new Date().toISOString() }
) {
  const prepared = chunks.map((chunk, i) => {
    const metadata = {};
    for (const [key, value] of Object.entries(chunk.metadata || {})) {
      if (isPrimitive(value)) metadata[key] = value;
    }

    const page = chunk.metadata?.loc?.pageNumber;
    if (typeof page === "number") metadata.page = page;

    chunk.metadata = {
      ...metadata,
      source: fileName,
      fileName,
      documentId,
      chunkIndex: i,
      ingestedAt,
    };
    return chunk;
  });

  return { chunks: prepared, ids: prepared.map((_, i) => chunkId(documentId, i)) };
}

/**
 * Loads a PDF, splits it into chunks, and stores in configured vector database
 * (Pinecone or Chroma, based on VECTOR_DB env var)
 * @param {string} filePath - Path to the temporary uploaded PDF file.
 * @param {{ fileName: string, documentId: string }} options
 * @returns {Promise<{ chunkCount: number, pageCount: number }>}
 */
export const ingestData = async (filePath, { fileName, documentId }) => {
  console.log(`\n📄 Loading PDF from: ${filePath}`);
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  console.log(`✓ Extracted ${docs.length} pages`);

  console.log(`✂️  Splitting into chunks...`);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const { chunks, ids } = prepareChunks(await splitter.splitDocuments(docs), {
    documentId,
    fileName,
  });
  console.log(`✓ Created ${chunks.length} chunks`);

  console.log(`💾 Storing chunks...`);
  try {
    await addDocuments(chunks, { ids });
    console.log(`✅ Ingestion Complete! (${chunks.length} chunks from ${fileName})\n`);
  } catch (error) {
    console.error("❌ Ingestion error:", error);
    throw new Error(`Failed to ingest documents: ${error.message}`);
  }

  return { chunkCount: chunks.length, pageCount: docs.length };
};
