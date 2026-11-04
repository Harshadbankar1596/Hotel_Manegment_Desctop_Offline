import { useState } from "react";
import { Heading } from "../../components/ui/index.js";
import { ask } from "../../services/dialog.js";
import AddCategoryPanel from "./sections/AddCategoryPanel.jsx";
import CategoryListPanel from "./sections/CategoryListPanel.jsx";

export default function Categories({ s, save, notify }) {
  const [name, setName] = useState("");
  const moveCat = async (i, dir) => {
    const list = [...s.categories];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await save("categories", list);
  };
  const renameCat = async (c) => {
    const n = await ask({ title: "Rename category", input: { label: "Category name", value: c }, confirmLabel: "Save name" });
    if (n == null || n === c) return;
    if (s.categories.some((x) => x !== c && x.toLowerCase() === n.toLowerCase()))
      return notify("A category named “" + n + "” already exists", "error");
    // dishes keep pointing at the category by name, so move them along with it
    const categories = s.categories.map((x) => (x === c ? n : x));
    if (!(await save("categories", categories))) return;
    if (s.dishes.some((d) => d.category === c)) {
      const ok = await save("dishes", s.dishes.map((d) => (d.category === c ? { ...d, category: n } : d)));
      if (!ok) {
        await save("categories", s.categories); // undo, so no dish is left in a category that does not exist
        return;
      }
    }
    notify("Category renamed");
  };
  const add = async () => {
    if (!name.trim()) return;
    if (s.categories.some((c) => c.toLowerCase() === name.trim().toLowerCase()))
      return notify("Category already exists", "error");
    if (await save("categories", [...s.categories, name.trim()])) {
      setName("");
      notify("Category added");
    }
  };
  return (
    <>
      <Heading
        eyebrow="MENU MANAGEMENT"
        title="Categories"
        desc="Organize your menu into clear sections."
      />
      <div className="columns">
        <AddCategoryPanel add={add} name={name} setName={setName} />
        <CategoryListPanel moveCat={moveCat} notify={notify} renameCat={renameCat} s={s} save={save} />
      </div>
    </>
  );
}
