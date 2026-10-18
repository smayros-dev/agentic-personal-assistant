import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const CATEGORIES = ["preference", "fact", "goal", "context", "general"];

/** Shows and edits the agent's long-term memories about the user. */
export default function MemoryPanel({ refreshKey = 0 }) {
  const [memories, setMemories] = useState([]);
  const [error, setError] = useState(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/memories");
      if (!res.ok) throw new Error("Failed to load memories");
      const data = await res.json();
      setMemories(data.memories || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const add = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const res = await apiFetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category }),
    });
    if (res.ok) {
      setContent("");
      load();
    } else {
      setError("Could not save memory");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Forget this memory?")) return;
    const res = await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const clearAll = async () => {
    if (!window.confirm("Forget everything the assistant remembers about you?")) return;
    const res = await apiFetch("/api/memories", { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <details className="memoryPanel">
      <summary>🧠 Memory ({memories.length})</summary>
      <p className="memoryHint">
        Facts the assistant remembers about you across conversations. Tell it something about
        yourself, or add one here.
      </p>

      <form className="memoryForm" onSubmit={add}>
        <input
          className="memoryInput"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g. Prefers short answers"
          maxLength={500}
          aria-label="New memory"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Memory category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="primaryButton" disabled={!content.trim()}>
          Add
        </button>
      </form>

      {error && <div className="memoryError">{error}</div>}

      {memories.length === 0 ? (
        <div className="memoryEmpty">Nothing remembered yet.</div>
      ) : (
        <ul className="memoryList">
          {memories.map((m) => (
            <li key={m.id} className="memoryItem">
              <span className="memoryCategory">{m.category}</span>
              <span className="memoryContent">{m.content}</span>
              <span className="memoryDate">{String(m.createdAt || "").slice(0, 10)}</span>
              <button type="button" className="memoryDelete" onClick={() => remove(m.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {memories.length > 0 && (
        <button type="button" className="clearButton" onClick={clearAll}>
          Forget all
        </button>
      )}
    </details>
  );
}
