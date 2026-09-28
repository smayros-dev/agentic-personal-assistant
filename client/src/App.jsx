import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import DocumentManager from "./components/DocumentManager";

// API base URL: configurable via VITE_API_URL for production deployments.
// For development (localhost), defaults to http://localhost:3001 for XMLHttpRequest compatibility.
// The Vite proxy only works for regular fetch; XMLHttpRequest (file uploads) need absolute URL.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "");

const SESSION_STORAGE_KEY = "agentic-assistant-session-id";
const MODEL_STORAGE_KEY = "agentic-assistant-model";

const createSessionId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getOrCreateSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = createSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
};

const getOrCreateModel = () => {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  return stored || "qwen3.6:latest"; // Match actual Ollama model name
};

const setStoredModel = (model) => {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
};

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [selectedModel, setSelectedModel] = useState(getOrCreateModel);
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const endOfMessagesRef = useRef(null);

  // Fetch available models from server on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch(`${API_BASE}/api/models`);
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data.models || []);
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearConversation = () => {
    const newSessionId = createSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    try {
      const body = { message: trimmed, sessionId };
      if (selectedModel) body.model = selectedModel;

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Chat request failed");
      }

      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: err?.message ?? "Chat request failed" }]);
    } finally {
      setLoading(false);
    }
  };

  // Uses XMLHttpRequest (instead of fetch) because it exposes upload
  // progress events, letting us show a percentage indicator for large PDFs.
  const uploadDocument = () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/ingest`);

      // Add API Key header for authentication
      const apiKey = localStorage.getItem("api-key") || "default-key";
      xhr.setRequestHeader("X-API-Key", apiKey);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText || "{}");
        } catch {
          data = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStatus("Uploaded and ingested successfully.");
          setSelectedFile(null);
        } else {
          setUploadStatus(data?.error || "Upload failed");
        }
        setUploading(false);
        resolve();
      };

      xhr.onerror = () => {
        setUploadStatus("Upload failed");
        setUploading(false);
        resolve();
      };

      xhr.send(formData);
    });
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="appHeaderInner">
          <div className="appTitle">Agentic Personal Assistant</div>
          <div className="appSubtitle">Upload PDFs, then chat with your knowledge base.</div>
        </div>
        <div className="headerControls">
          <div className="modelSelector">
            <label htmlFor="model-select">Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedModel(value);
                setStoredModel(value);
              }}
            >
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model === "qwen3.6:latest" ? `${model} ⭐ (Default)` : model}
                  </option>
                ))
              ) : (
                <option value="qwen3.6">Loading models...</option>
              )}
            </select>
            {loadingModels && <span className="loadingIndicator">Loading models...</span>}
          </div>
          <button
            className="clearButton"
            onClick={clearConversation}
            disabled={messages.length === 0 && !loading}
            title="Clear conversation and start a new session"
          >
            Clear conversation
          </button>
        </div>
      </header>

      <main className="appMain">
        <section className="uploadPanel">
          <div className="uploadRow">
            <label className="uploadButton" htmlFor="pdf-upload">
              Choose PDF
            </label>
            <input
              id="pdf-upload"
              className="uploadInput"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="primaryButton"
              onClick={uploadDocument}
              disabled={!selectedFile || uploading}
            >
              {uploading ? `Uploading... ${uploadProgress}%` : "Upload"}
            </button>
            <div className="uploadMeta">
              {selectedFile ? selectedFile.name : "No file selected"}
            </div>
          </div>
          {uploading && (
            <div className="uploadProgressTrack">
              <div className="uploadProgressBar" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {uploadStatus && <div className="uploadStatus">{uploadStatus}</div>}
        </section>

        <DocumentManager />

        <section className="chatPanel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="emptyState">
                Upload a PDF to ingest it, then ask a question below.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "messageRow isUser" : "messageRow isAi"}>
                <div className="messageBubble">
                  {m.role === "ai" ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="messageRow isAi">
                <div className="messageBubble isTyping">Thinking…</div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="composer">
            <div className="composerInner">
              <textarea
                className="composerInput"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Message your assistant…"
                rows={1}
              />
              <button
                className="sendButton"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
            <div className="composerHint">Enter to send · Shift+Enter for a new line</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
