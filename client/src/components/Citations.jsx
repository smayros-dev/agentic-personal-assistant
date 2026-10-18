/** Source chips for an answer: [n] file · p.X, with the passage as a tooltip. */
export default function Citations({ items }) {
  if (!items?.length) return null;

  return (
    <div className="citations" aria-label="Sources">
      <span className="citationsLabel">Sources</span>
      {items.map((c) => (
        <span key={c.id} className="citationChip" title={c.snippet}>
          [{c.id}] {c.source}
          {c.page != null && ` · p.${c.page}`}
        </span>
      ))}
    </div>
  );
}
