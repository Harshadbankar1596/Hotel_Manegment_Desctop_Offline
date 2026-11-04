import { Search } from "lucide-react";
import FoodThumb from "../../../components/common/FoodThumb.jsx";
import { Panel } from "../../../components/ui/index.js";
import { ask } from "../../../services/dialog.js";
import { money } from "../../../utils/format.js";

export default function DishCatalog({
  notify,
  open,
  q,
  s,
  save,
  setQ,
}) {
  return (
    <Panel title="Menu catalog" desc="Dish pricing and availability">
      <div className="search my-4">
        <Search size={15} />
        <input
          placeholder="Search dishes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>DISH</th>
              <th>CATEGORY</th>
              <th>TYPE</th>
              <th>VARIANTS & PRICES</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {s.dishes
              .filter((d) => String(d.name || "").toLowerCase().includes(q.toLowerCase()))
              .map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="menu-dish-cell"><FoodThumb dish={d} /><span><b>{d.name}</b><small>{d.type === "veg" ? "Vegetarian" : "Non-vegetarian"}</small></span></div>
                  </td>
                  <td>{d.category}</td>
                  <td>{d.type === "veg" ? "Veg" : "Non-veg"}</td>
                  <td>
                    {(d.variants || []).map((v, vi) => (
                      <div key={v.name + "|" + vi}>
                        {v.name} <b>{money(v.pricePaise)}</b>
                      </div>
                    ))}
                  </td>
                  <td>
                    <button
                      className="status-toggle"
                      onClick={() =>
                        save(
                          "dishes",
                          s.dishes.map((x) =>
                            x.id === d.id
                              ? { ...x, available: x.available === false }
                              : x,
                          ),
                        )
                      }
                    >
                      {d.available === false ? "Unavailable" : "Available"}
                    </button>
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => open(d)}>
                      Edit
                    </button>{" "}
                    <button
                      className="text-btn danger"
                      onClick={async () => {
                        const yes = await ask({
                          title: "Delete " + d.name + "?",
                          message: "Existing bills keep their saved copy of this dish.",
                          confirmLabel: "Delete dish",
                          danger: true,
                        });
                        if (yes) {
                          await save("dishes", s.dishes.filter((x) => x.id !== d.id));
                          notify("Dish deleted");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
