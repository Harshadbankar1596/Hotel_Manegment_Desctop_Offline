import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import FoodThumb from "../../../components/common/FoodThumb.jsx";
import { Empty } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function DishPicker({ add, notify, order, s }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const drag = useRef({ down: false });
  const gridRef = useRef(null);
  const [bubbleY, setBubbleY] = useState(null);
  // which letter is under the pointer (geometry based, so dragging along the rail is smooth)
  const letterAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pad = 5;
    const n = LETTERS.length + 1.4; // "All" is a little taller
    const y = Math.min(Math.max(e.clientY - r.top - pad, 0), r.height - pad * 2 - 0.01);
    const pos = (y / (r.height - pad * 2)) * n;
    if (pos < 1.4) return "";
    return LETTERS[Math.min(LETTERS.length - 1, Math.floor(pos - 1.4))];
  };
  const yAt = (e) => {
    const body = e.currentTarget.parentElement.getBoundingClientRect();
    return Math.min(Math.max(e.clientY - body.top, 28), body.height - 28);
  };
  const [nudge, setNudge] = useState(null); // dish whose variants are highlighted after a photo tap
  const nudgeTimer = useRef(null);
  useEffect(() => () => clearTimeout(nudgeTimer.current), []);
  const [kind, setKind] = useState("all"); // all | veg | non-veg
  const [letter, setLetter] = useState(""); // clicked (locked) letter
  const [hoverLetter, setHoverLetter] = useState(""); // letter under the mouse
  const baseDishes = s.dishes.filter(
    (d) =>
      d.available !== false &&
      (cat === "All" || d.category === cat) &&
      (kind === "all" || (kind === "veg" ? d.type !== "non-veg" : d.type === "non-veg")) &&
      String(d.name || "").toLowerCase().includes(q.toLowerCase()),
  );
  const firstLetter = (d) => (d.name || "").trim().charAt(0).toUpperCase();
  const lettersWith = new Set(baseDishes.map(firstLetter));
  const activeLetter = hoverLetter || letter;
  const dishes = activeLetter ? baseDishes.filter((d) => firstLetter(d) === activeLetter) : baseDishes;

  return (
    <section className="menu-pane">
      <div className="menu-tools">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search dishes…" value={q} onChange={(e) => { setQ(e.target.value); setLetter(""); }} />
          {q && <button className="clear-x" onClick={() => { setQ(""); setLetter(""); }} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <div className="kind-filter" role="group" aria-label="Food type">
          {[["all", "All"], ["veg", "Veg"], ["non-veg", "Non-veg"]].map(([k, label]) => (
            <button key={k} className={"kind-btn " + k + (kind === k ? " active" : "")} onClick={() => { setKind(k); setLetter(""); }} aria-pressed={kind === k}>
              {k !== "all" && <i className={"veg-mark " + (k === "veg" ? "veg" : "nonveg")} />}
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="pill-row scroll">
        <button className={"pill" + (cat === "All" ? " active" : "")} onClick={() => { setCat("All"); setLetter(""); }}>
          All
        </button>
        {s.categories.map((c) => (
          <button key={c} className={"pill" + (cat === c ? " active" : "")} onClick={() => { setCat(c); setLetter(""); }}>
            {c}
          </button>
        ))}
      </div>
      <div className="menu-body">
      <nav
        className="az-rail"
        aria-label="Filter dishes by first letter"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const L = letterAt(e);
          drag.current = { down: true, moved: false, start: L, before: letter };
          setLetter(L);
          setHoverLetter("");
          setBubbleY(yAt(e));
        }}
        onPointerMove={(e) => {
          const L = letterAt(e);
          setBubbleY(yAt(e));
          if (drag.current.down) {
            if (L !== drag.current.start) drag.current.moved = true;
            setLetter(L);
          } else setHoverLetter(L);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = { down: false };
          // plain tap on the already-selected letter clears it
          if (d.down && !d.moved && d.start === d.before && d.start !== "") setLetter("");
          if (e.pointerType !== "mouse") setBubbleY(null);
        }}
        onPointerCancel={() => { drag.current = { down: false }; setBubbleY(null); }}
        onPointerLeave={() => { if (!drag.current.down) { setHoverLetter(""); setBubbleY(null); } }}
      >
        {["", ...LETTERS].map((L) => {
          const has = L === "" || lettersWith.has(L);
          const on = (hoverLetter || letter) === L;
          return (
            <button
              type="button"
              key={L || "all"}
              aria-label={L ? "Show dishes starting with " + L : "Show all dishes"}
              aria-pressed={letter === L}
              disabled={!has}
              onClick={(e) => {
                // mouse / touch are handled by the rail's pointer events; this is for keyboard (Enter / Space)
                if (e.detail !== 0) return;
                setLetter(letter === L ? "" : L);
              }}
              className={"az-btn" + (L === "" ? " az-all" : "") + (on ? (letter === L && !hoverLetter ? " active" : " hover") : "") + (has ? "" : " none")}
            >
              {L || "All"}
            </button>
          );
        })}
      </nav>
      {bubbleY != null && activeLetter && (
        <div className="az-bubble" style={{ top: bubbleY }} key={activeLetter}>
          <span>{activeLetter}<small>{baseDishes.filter((d) => firstLetter(d) === activeLetter).length} dishes</small></span>
        </div>
      )}
      <div className="dish-grid fade" key={activeLetter + "|" + kind + "|" + cat} ref={gridRef}>
        {!dishes.length && (<div className="dish-empty">
        <Empty
          title={s.dishes.length ? "No dishes found" : "Your menu is empty"}
          desc={
            !s.dishes.length
              ? "Add dishes from Menu & Dishes to start billing."
              : activeLetter
                ? `No dish starts with “${activeLetter}”${q || cat !== "All" || kind !== "all" ? " in the current search / category" : ""}.`
                : "Try another search or category."
          }
        />
        {activeLetter && (
          <button className="text-btn" onClick={() => { setLetter(""); setHoverLetter(""); }}>
            Clear letter “{activeLetter}”
          </button>
        )}
        </div>)}
        {dishes.map((d) => {
          const inCart = order.items.filter((x) => x.dishId === d.id).reduce((a, x) => a + x.quantity, 0);
          const variants = d.variants || [];
          const single = variants.length === 1;
          return (
            <article className={"dish-card" + (inCart ? " in-cart" : "")} key={d.id}>
              <button
                className="dish-pic"
                onClick={() => {
                  if (single) return add(d, variants[0]);
                  if (variants.length > 1) {
                    setNudge(d.id);
                    clearTimeout(nudgeTimer.current);
                    nudgeTimer.current = setTimeout(() => setNudge(null), 1400);
                    notify("Choose a size / variant for " + d.name + " below");
                  }
                }}
                aria-label={single ? "Add " + d.name : d.name + ": choose a variant below"}
              >
                <FoodThumb dish={d} size="lg" />
                {inCart > 0 && <em className="dish-badge">{inCart}</em>}
                <i className={"veg-mark " + (d.type === "non-veg" ? "nonveg" : "veg")} title={d.type === "non-veg" ? "Non-veg" : "Veg"} />
              </button>
              <div className="dish-info">
                <b title={d.name}>{d.name}</b>
                <small>{d.category}</small>
              </div>
              <div className={"variants" + (single ? " single" : "") + (nudge === d.id ? " nudge" : "")}>
                {variants.map((v, vi) => (
                  <button key={v.name + "|" + vi} onClick={() => add(d, v)} title={"Add " + d.name + " (" + v.name + ")"}>
                    <span>{single ? "" : v.name}</span>
                    <b>{money(v.pricePaise)}</b>
                    <Plus size={14} />
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      </div>
    </section>
  );
}
