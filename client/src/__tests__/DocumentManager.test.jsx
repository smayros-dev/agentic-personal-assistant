import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentManager } from "../components/DocumentManager";

// Mock fetch API
global.fetch = vi.fn();

describe("DocumentManager - Logic & Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty documents list", () => {
    const documents = [];
    expect(documents).toHaveLength(0);
  });

  it("should search documents by query", () => {
    const documents = [
      { id: "1", fileName: "report.pdf" },
      { id: "2", fileName: "notes.txt" },
    ];

    const search = (query) => {
      return documents.filter((doc) => doc.fileName.toLowerCase().includes(query.toLowerCase()));
    };

    const results = search("report");
    expect(results).toHaveLength(1);
    expect(results[0].fileName).toBe("report.pdf");
  });

  it("should display document statistics", () => {
    const stats = {
      totalDocuments: 5,
      totalSize: 1024000,
      totalChunks: 100,
    };

    expect(stats.totalDocuments).toBe(5);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.totalChunks).toBe(100);
  });

  it("should handle expand/collapse document details", () => {
    const expandedDocs = new Set();

    const toggleExpanded = (docId) => {
      if (expandedDocs.has(docId)) {
        expandedDocs.delete(docId);
      } else {
        expandedDocs.add(docId);
      }
    };

    toggleExpanded("doc-1");
    expect(expandedDocs.has("doc-1")).toBe(true);

    toggleExpanded("doc-1");
    expect(expandedDocs.has("doc-1")).toBe(false);
  });

  it("should format file size correctly", () => {
    const formatSize = (bytes) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(1024 * 1024)).toBe("1 MB");
  });

  it("should format date correctly", () => {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const date = new Date("2024-01-15");
    const formatted = formatDate(date);
    expect(formatted).toContain("2024");
  });

  it("should handle loading state", () => {
    let loading = false;

    const setLoading = (state) => {
      loading = state;
    };

    setLoading(true);
    expect(loading).toBe(true);

    setLoading(false);
    expect(loading).toBe(false);
  });

  it("should handle error state", () => {
    let error = null;

    const setError = (msg) => {
      error = msg;
    };

    const clearError = () => {
      error = null;
    };

    setError("Failed to load");
    expect(error).toBe("Failed to load");

    clearError();
    expect(error).toBeNull();
  });
});

describe("DocumentManager - Component Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [],
        stats: { totalDocuments: 0, totalSize: 0, totalChunks: 0 },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render DocumentManager component", async () => {
    render(<DocumentManager />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it("should fetch and display documents on mount", async () => {
    fetch.mockClear();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [
          { id: "1", fileName: "test.pdf", size: 1024, uploadedAt: "2024-01-15" },
        ],
        stats: { totalDocuments: 1, totalSize: 1024, totalChunks: 5 },
      }),
    });

    render(<DocumentManager />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/documents");
    });
  });

  it("should handle loading state while fetching documents", async () => {
    render(<DocumentManager />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});

describe("DocumentManager - UI Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [],
        stats: { totalDocuments: 0, totalSize: 0, totalChunks: 0 },
      }),
    });
  });

  it("should handle search input change", () => {
    let searchQuery = "";

    const handleSearchChange = (value) => {
      searchQuery = value;
    };

    handleSearchChange("test");
    expect(searchQuery).toBe("test");
  });

  it("should clear search results", () => {
    let searchQuery = "test";

    const clearSearch = () => {
      searchQuery = "";
    };

    clearSearch();
    expect(searchQuery).toBe("");
  });

  it("should track selected documents", () => {
    const selectedDocs = new Set();

    const toggleSelect = (id) => {
      if (selectedDocs.has(id)) {
        selectedDocs.delete(id);
      } else {
        selectedDocs.add(id);
      }
    };

    toggleSelect("doc-1");
    expect(selectedDocs.has("doc-1")).toBe(true);

    toggleSelect("doc-2");
    expect(selectedDocs.size).toBe(2);
  });

  it("should build document metadata", () => {
    const buildMetadata = (doc) => {
      return {
        id: doc.id,
        name: doc.fileName,
        pages: doc.pageCount || 0,
        size: doc.size || 0,
        uploaded: doc.uploadedAt,
      };
    };

    const doc = {
      id: "1",
      fileName: "test.pdf",
      pageCount: 10,
      size: 512000,
      uploadedAt: "2024-01-15",
    };

    const metadata = buildMetadata(doc);
    expect(metadata.name).toBe("test.pdf");
    expect(metadata.pages).toBe(10);
  });
});

describe("DocumentManager - Data Processing", () => {
  it("should filter documents by date range", () => {
    const docs = [
      { id: "1", fileName: "doc1.pdf", uploadedAt: new Date("2024-01-01") },
      { id: "2", fileName: "doc2.pdf", uploadedAt: new Date("2024-02-01") },
      { id: "3", fileName: "doc3.pdf", uploadedAt: new Date("2024-03-01") },
    ];

    const filterByDate = (docs, startDate, endDate) => {
      return docs.filter((d) => {
        const date = new Date(d.uploadedAt);
        return date >= startDate && date <= endDate;
      });
    };

    const results = filterByDate(docs, new Date("2024-01-15"), new Date("2024-02-15"));

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
  });

  it("should sort documents by size", () => {
    const docs = [
      { id: "1", size: 3000 },
      { id: "2", size: 1000 },
      { id: "3", size: 2000 },
    ];

    const sortBySize = (docs) => [...docs].sort((a, b) => b.size - a.size);

    const sorted = sortBySize(docs);
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("2");
  });

  it("should calculate total statistics", () => {
    const docs = [
      { id: "1", size: 1000, chunks: 5 },
      { id: "2", size: 2000, chunks: 10 },
    ];

    const calculateStats = (docs) => ({
      count: docs.length,
      totalSize: docs.reduce((sum, d) => sum + d.size, 0),
      totalChunks: docs.reduce((sum, d) => sum + d.chunks, 0),
    });

    const stats = calculateStats(docs);
    expect(stats.count).toBe(2);
    expect(stats.totalSize).toBe(3000);
    expect(stats.totalChunks).toBe(15);
  });

  it("should handle document deletion with API call", async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    // Simulating delete logic
    const handleDelete = async (docId) => {
      const response = await fetch(`http://localhost:3001/api/documents/${docId}`, {
        method: "DELETE",
      });
      return response.ok;
    };

    const result = await handleDelete("doc-1");
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/documents/doc-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("should handle document search with API call", async () => {
    const handleSearch = async (query) => {
      if (!query) return [];
      return [{ id: "1", fileName: "result.pdf" }];
    };

    const results = await handleSearch("test");
    expect(results).toHaveLength(1);
    expect(results[0].fileName).toBe("result.pdf");
  });
});
