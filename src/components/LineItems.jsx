import { useState } from "react";
import Modal from "./button-row/Modal";

const CONDITIONS = [
  { value: "", label: "New" },
  { value: "R", label: "Rebuilt (R)" },
  { value: "U", label: "Used (U)" },
];

function money(n) {
  return "$" + n.toFixed(2);
}

/**
 * LineItems
 * Props:
 *  - items: array of either:
 *      { kind: 'item', tag: 'LABOR'|'PART', code, desc, sub, condition, qty, price, total }
 *      { kind: 'comment', desc }  — freeform note, no code/qty/price/total
 *  - onAddLine(tag, condition): append a blank labor/part row (condition only applies to PART:
 *      "" = New, "U" = Used, "R" = Rebuilt)
 *  - onUpdateLine(index, field, value): edit code/desc/qty/price on an existing row
 *  - onDeleteLine(index): remove a row
 *  - onAddComment(): append a blank comment row
 */
export default function LineItems({ items, onAddLine, onAddComment, onUpdateLine, onDeleteLine }) {
  const [conditionOpen, setConditionOpen] = useState(false);

  function handlePickCondition(condition) {
    onAddLine("PART", condition);
    setConditionOpen(false);
  }

  return (
    <>
      <div className="bay-line hd">
        <div>Code</div>
        <div>Description</div>
        <div>Qty</div>
        <div style={{ textAlign: "right" }}>Price</div>
        <div style={{ textAlign: "right" }}>Total</div>
        <div></div>
      </div>

      {items.length === 0 ? (
        <div className="items-empty-row">No line items yet — add labor or parts below.</div>
      ) : (
        items.map((it, i) =>
          it.kind === "comment" ? (
            <div className="bay-line comment-line" key={i}>
              <input
                className="comment-text-input"
                value={it.desc}
                onChange={(e) => onUpdateLine(i, "desc", e.target.value)}
                placeholder="Comment..."
              />
              <button
                className="line-delete"
                onClick={() => onDeleteLine(i)}
                aria-label="Remove comment"
                title="Remove line"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="bay-line" key={i}>
              <div className="code">
                <input
                  value={it.code}
                  onChange={(e) => onUpdateLine(i, "code", e.target.value)}
                  placeholder="code"
                />
              </div>
              <div className="desc">
                <div className="desc-row">
                  {it.condition ? <span className="cond-tag">({it.condition})</span> : null}
                  <input value={it.desc} onChange={(e) => onUpdateLine(i, "desc", e.target.value)} />
                </div>
                {it.sub ? <span>{it.sub}</span> : null}
              </div>
              <div className="num">
                <input
                  value={it.qty}
                  onChange={(e) => onUpdateLine(i, "qty", e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="num">
                <input
                  value={it.price}
                  onChange={(e) => onUpdateLine(i, "price", e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="num">{it.qty === "" || it.price === "" ? "—" : money(it.total)}</div>
              <button
                className="line-delete"
                onClick={() => onDeleteLine(i)}
                aria-label={`Remove ${it.desc}`}
                title="Remove line"
              >
                ✕
              </button>
            </div>
          )
        )
      )}

      <div className="add-line-btns">
        <button onClick={() => onAddLine("LABOR")}>+ Add Labor</button>
        <button onClick={() => setConditionOpen(true)}>+ Add Part</button>
        <button onClick={() => onAddComment()}>+ Add Comment</button>
      </div>

      <Modal
        isOpen={conditionOpen}
        onClose={() => setConditionOpen(false)}
        title="Part Condition"
        variant="drawer"
      >
        <div className="board-section-title">Condition</div>
        <div className="pay-grid">
          {CONDITIONS.map((c) => (
            <button key={c.label} className="pay-btn" onClick={() => handlePickCondition(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}