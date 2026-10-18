const TOOL_LABELS = {
  search_knowledge_base: "Searched documents",
  list_documents: "Listed documents",
  summarize_document: "Read document",
  get_current_datetime: "Checked the date",
  calculator: "Calculated",
  save_memory: "Remembered",
  recall_memories: "Recalled memories",
};

const formatArgs = (args) => {
  if (!args || typeof args !== "object") return "";
  const values = Object.values(args).filter((v) => v !== undefined && v !== "");
  const text = values.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
};

/** Collapsible list of the tools the agent used while answering. */
export default function AgentSteps({ steps, live = false }) {
  if (!steps?.length) return null;

  return (
    <details className="agentSteps" open={live}>
      <summary>
        Agent steps ({steps.length}){live && " · working…"}
      </summary>
      <ol>
        {steps.map((s) => (
          <li key={s.id} className={s.pending ? "stepItem isPending" : "stepItem"}>
            <span className="stepName">{TOOL_LABELS[s.name] || s.name}</span>
            {formatArgs(s.args) && <span className="stepArgs"> “{formatArgs(s.args)}”</span>}
            {s.resultPreview && <div className="stepResult">{s.resultPreview}</div>}
          </li>
        ))}
      </ol>
    </details>
  );
}
