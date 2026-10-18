import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Citations from "../components/Citations";
import AgentSteps from "../components/AgentSteps";
import MemoryPanel from "../components/MemoryPanel";
import { parseSseBuffer, streamChat } from "../lib/api";

const jsonResponse = (data, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) });

describe("Citations", () => {
  it("renders a chip per citation", () => {
    render(
      <Citations
        items={[
          { id: 1, source: "a.pdf", page: 2, snippet: "alpha" },
          { id: 2, source: "b.pdf", page: null, snippet: "beta" },
        ]}
      />
    );
    expect(screen.getByText("[1] a.pdf · p.2")).toHaveAttribute("title", "alpha");
    expect(screen.getByText("[2] b.pdf")).toBeInTheDocument();
  });

  it("renders nothing without citations", () => {
    const { container } = render(<Citations items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AgentSteps", () => {
  it("shows the step count and a friendly tool name", () => {
    render(
      <AgentSteps
        steps={[
          {
            id: "1",
            name: "search_knowledge_base",
            args: { query: "revenue" },
            resultPreview: "[1] ...",
          },
        ]}
      />
    );
    expect(screen.getByText("Agent steps (1)")).toBeInTheDocument();
    expect(screen.getByText("Searched documents")).toBeInTheDocument();
    expect(screen.getByText(/revenue/)).toBeInTheDocument();
  });
});

describe("MemoryPanel", () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it("lists memories and deletes one", async () => {
    fetch.mockImplementation((url, init) => {
      if (init?.method === "DELETE") return jsonResponse({ ok: true });
      return jsonResponse({
        memories: [
          { id: "m1", content: "Likes tea", category: "preference", createdAt: "2026-10-18" },
        ],
      });
    });
    window.confirm = vi.fn(() => true);

    render(<MemoryPanel />);
    expect(await screen.findByText("Likes tea")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/memories/m1"),
        expect.objectContaining({ method: "DELETE" })
      )
    );
  });
});

describe("parseSseBuffer", () => {
  it("parses complete events and keeps the partial rest", () => {
    const { events, rest } = parseSseBuffer(
      'data: {"type":"token","text":"a"}\n\n: ping\n\ndata: {"type":"done"}\n\ndata: {"ty'
    );
    expect(events).toEqual([{ type: "token", text: "a" }, { type: "done" }]);
    expect(rest).toBe('data: {"ty');
  });
});

describe("streamChat", () => {
  it("emits events across chunk boundaries and resolves with done", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"start"}\n\ndata: {"type":"tok',
      'en","text":"hi"}\n\ndata: {"type":"done","answer":"hi"}\n\n',
    ];
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      },
    });
    fetch.mockResolvedValueOnce({ ok: true, status: 200, body });

    const onEvent = vi.fn();
    const done = await streamChat({ message: "hello", onEvent });
    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(done).toEqual({ type: "done", answer: "hi" });
  });

  it("rejects on an error event", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"error","message":"down"}\n\n'));
        controller.close();
      },
    });
    fetch.mockResolvedValueOnce({ ok: true, status: 200, body });
    await expect(streamChat({ message: "x" })).rejects.toThrow("down");
  });
});
