import { Plus } from "lucide-react";
import { Btn, Panel } from "../../../components/ui/index.js";

export default function AddCategoryPanel({ add, name, setName }) {
  return (
    <Panel title="Add a category" desc="Create a new menu section">
      <label className="field-label">
        Category name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Chef specials"
        />
      </label>
      <Btn primary icon={Plus} onClick={add}>
        Add category
      </Btn>
    </Panel>
  );
}
