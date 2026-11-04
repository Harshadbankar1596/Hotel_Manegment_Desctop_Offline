import { Empty, Panel } from "../../../components/ui/index.js";
import { money } from "../../../utils/format.js";

export default function TopDishesPanel({ top }) {
  return (
    <Panel
      title="Top-selling dishes"
      desc="Best performers by quantity sold"
    >
      {top.length ? (
        top.map((x, i) => (
          <div className="top-dish" key={x.name}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <b>
              {x.name}
              <small>{x.qty} items sold</small>
            </b>
            <strong>{money(x.total)}</strong>
          </div>
        ))
      ) : (
        <Empty
          title="No dishes sold yet"
          desc="Your best-selling dishes appear here."
        />
      )}
    </Panel>
  );
}
