function money(n) {
  return "$" + n.toFixed(2);
}

/**
 * LineItems
 * Props:
 *  - items: array of either:
 *      { kind: 'item', tag: 'LABOR'|'PART', code, desc, sub, qty, price, total }
 *      { kind: 'comment', desc }  — freeform note, no code/qty/price/total
 *  - onAddLine(tag): append a blank labor/part row
 *  - onUpdateLine(index, field, value): edit code/desc/qty/price on an existing row
 *  - onDeleteLine(index): remove a row
 */
export default function LineItems({ items, onAddLine, onUpdateLine, onDeleteLine }) {
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
                <input value={it.desc} onChange={(e) => onUpdateLine(i, "desc", e.target.value)} />
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
        <button onClick={() => onAddLine("PART")}>+ Add Part</button>
      </div>
    </>
  );
}