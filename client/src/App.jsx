import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import DocumentManager from "./components/DocumentManager";
import MemoryPanel from "./components/MemoryPanel";
import Citations from "./components/Citations";
import AgentSteps from "./components/AgentSteps";
import { API_BASE, apiFetch, chatOnce, getApiKey, streamChat } from "./lib/api";

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
  const [documents, setDocuments] = useState([]);
  const [documentFilter, setDocumentFilter] = useState("");
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const [memoryVersion, setMemoryVersion] = useState(0);

  const endOfMessagesRef = useRef(null);
  const abortRef = useRef(null);

  // Restore the conversation saved on the server for this session
  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const res = await apiFetch(`/api/conversations/${sessionId}`);
        if (!res?.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setMessages(
          (data.messages || []).map((m) => ({
            role: m.role === "assistant" ? "ai" : "user",
            text: m.content,
            citations: m.citations || [],
            steps: m.steps || [],
          }))
        );
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Documents for the "Search in" filter
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const res = await apiFetch("/api/documents");
        if (!res?.ok) return;
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    };
    loadDocuments();
  }, [documentsVersion]);

  // Fetch available models from server on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await apiFetch("/api/models");
        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];
          setAvailableModels(models);
          // A stored/default model that isn't installed would make every chat fail:
          // fall back to the server's default, else the first chat (non-embedding) model.
          setSelectedModel((current) => {
            if (!models.length || models.includes(current)) return current;
            return models.includes(data.defaultModel)
              ? data.defaultModel
              : (models.find((m) => !/embed/i.test(m)) ?? models[0]);
          });
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

  // Updates the in-progress AI message (always the last one while loading)
  const updateLast = (update) =>
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...update(next[next.length - 1]) };
      return next;
    });

  const handleStreamEvent = (event) => {
    switch (event.type) {
      case "token":
        updateLast((m) => ({ text: m.text + event.text }));
        break;
      case "reset":
        updateLast(() => ({ text: "" }));
        break;
      case "tool_call":
        // Text produced before a tool call is the model "thinking out loud"
        updateLast((m) => ({
          text: "",
          steps: [...m.steps, { id: event.id, name: event.name, args: event.args, pending: true }],
        }));
        break;
      case "tool_result":
        updateLast((m) => ({
          steps: m.steps.map((s) =>
            s.id === event.id ? { ...s, resultPreview: event.preview, pending: false } : s
          ),
        }));
        if (event.name === "save_memory") setMemoryVersion((v) => v + 1);
        break;
      default:
        break;
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "ai", text: "", citations: [], steps: [], streaming: true },
    ]);

    const body = { message: trimmed, sessionId };
    if (selectedModel) body.model = selectedModel;
    if (documentFilter) body.documentId = documentFilter;

    const controller = new AbortController();
    abortRef.current = controller;
    let receivedEvents = false;

    try {
      let result;
      try {
        const done = await streamChat({
          ...body,
          signal: controller.signal,
          onEvent: (event) => {
            receivedEvents = true;
            handleStreamEvent(event);
          },
        });
        result = { answer: done.answer, citations: done.citations, steps: done.steps };
      } catch (streamErr) {
        // Streaming unavailable (e.g. old server or proxy): fall back to plain JSON
        if (receivedEvents || controller.signal.aborted) throw streamErr;
        result = await chatOnce(body);
      }

      updateLast(() => ({
        text: result.answer,
        citations: result.citations || [],
        steps: result.steps || [],
        streaming: false,
      }));
    } catch (err) {
      updateLast((m) => ({
        text: controller.signal.aborted
          ? m.text || "Stopped."
          : (err?.message ?? "Chat request failed"),
        steps: m.steps.map((s) => ({ ...s, pending: false })),
        streaming: false,
      }));
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const stopGenerating = () => abortRef.current?.abort();

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

      // Add API Key header only when one is configured
      const apiKey = getApiKey();
      if (apiKey) xhr.setRequestHeader("X-API-Key", apiKey);

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
          setUploadStatus(
            data?.chunkCount
              ? `Uploaded and ingested successfully (${data.pageCount} pages, ${data.chunkCount} chunks).`
              : "Uploaded and ingested successfully."
          );
          setSelectedFile(null);
          setDocumentsVersion((v) => v + 1);
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
          <div className="modelSelector">
            <label htmlFor="document-filter">Search in:</label>
            <select
              id="document-filter"
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
            >
              <option value="">All documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName}
                </option>
              ))}
            </select>
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

        <DocumentManager
          refreshKey={documentsVersion}
          onChange={() => setDocumentsVersion((v) => v + 1)}
        />
        <MemoryPanel refreshKey={memoryVersion} />

        <section className="chatPanel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="emptyState">
                Upload a PDF to ingest it, then ask a question below.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "messageRow isUser" : "messageRow isAi"}>
                {/* isTyping marks an answer still being generated (e2e tests rely on it) */}
                <div className={m.streaming ? "messageBubble isTyping" : "messageBubble"}>
                  {m.role === "ai" ? (
                    <>
                      <AgentSteps steps={m.steps} live={m.streaming} />
                      {m.streaming && !m.text ? (
                        "Thinking…"
                      ) : (
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      )}
                      {!m.streaming && <Citations items={m.citations} />}
                    </>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
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
              {loading ? (
                <button className="sendButton" onClick={stopGenerating}>
                  Stop
                </button>
              ) : (
                <button className="sendButton" onClick={sendMessage} disabled={!input.trim()}>
                  Send
                </button>
              )}
            </div>
            <div className="composerHint">Enter to send · Shift+Enter for a new line</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
