import { tool } from "langchain";
import { z } from "zod";
import { searchVectorStore } from "./vectorstore.js";

export const searchKnowledgeBase = tool(
  async ({ query }) => {
    try {
      const results = await searchVectorStore(query, 5);

      if (results.length === 0) {
        return "No relevant information found in the knowledge base.";
      }

      // Join chunks with metadata for citation
      const contextBlocks = results
        .map((doc) => {
          const source = doc.metadata?.source || "Unknown";
          const page = doc.metadata?.page || "N/A";
          return `[Source: ${source}, Page ${page}]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");

      return contextBlocks;
    } catch (error) {
      console.error("❌ Search error:", error.message);
      throw new Error(`Failed to search knowledge base: ${error.message}`);
    }
  },
  {
    name: "search_knowledge_base",
    description:
      "Searches the internal knowledge base (Pinecone or Chroma) for information from uploaded PDF documents. Returns the most relevant chunks with source attribution.",
    schema: z.object({
      query: z.string().describe("The search query to look up in the knowledge base"),
    }),
  }
);
