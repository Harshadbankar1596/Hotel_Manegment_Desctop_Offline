import { ChevronDown, ChevronUp, Pencil, Tags, Trash2 } from "lucide-react";
import { Panel } from "../../../components/ui/index.js";
import { ask } from "../../../services/dialog.js";

export default function CategoryListPanel({
  moveCat,
  notify,
  renameCat,
  s,
  save,
}) {
  return (
    <Panel
      title="Menu categories"
      desc={`${s.categories.length} categories configured`}
    >
      {s.categories.map((c, ci) => (
        <div className="category-item" key={c}>
          <span>
            <Tags size={16} />
          </span>
          <b>
            {c}
            <small>
              {s.dishes.filter((d) => d.category === c).length} dishes
            </small>
          </b>
          <span className="cat-tools">
            <button aria-label={"Move " + c + " up"} title="Move up" disabled={ci === 0} onClick={() => moveCat(ci, -1)}>
              <ChevronUp size={15} />
            </button>
            <button aria-label={"Move " + c + " down"} title="Move down" disabled={ci === s.categories.length - 1} onClick={() => moveCat(ci, 1)}>
              <ChevronDown size={15} />
            </button>
            <button aria-label={"Rename " + c} title="Rename" onClick={() => renameCat(c)}>
              <Pencil size={15} />
            </button>
          <button
            aria-label={"Delete " + c}
            title="Delete"
            onClick={async () => {
              if (s.dishes.some((d) => d.category === c))
                return notify(
                  "Move or delete dishes in this category first",
                  "error",
                );
              if (
                await ask({
                  title: "Delete category “" + c + "”?",
                  confirmLabel: "Delete",
                  danger: true,
                })
              )
                await save(
                  "categories",
                  s.categories.filter((x) => x !== c),
                );
            }}
          >
            <Trash2 size={15} />
          </button>
          </span>
        </div>
      ))}
    </Panel>
  );
}
