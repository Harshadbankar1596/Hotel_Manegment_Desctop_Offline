import { BookOpen, Check, Tags, Utensils } from "lucide-react";
import { Stat } from "../../../components/ui/index.js";

export default function MenuStats({ s }) {
  return (
    <div className="stats">
      <Stat
        label="Total dishes"
        value={s.dishes.length}
        note="Across all categories"
        icon={Utensils}
      />
      <Stat
        label="Available"
        value={s.dishes.filter((d) => d.available !== false).length}
        note="Visible for ordering"
        icon={Check}
      />
      <Stat
        label="Categories"
        value={s.categories.length}
        note="Menu organization"
        icon={Tags}
      />
      <Stat
        label="Variants"
        value={s.dishes.reduce((a, d) => a + (d.variants || []).length, 0)}
        note="Serving sizes and options"
        icon={BookOpen}
      />
    </div>
  );
}
