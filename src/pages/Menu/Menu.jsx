import { useState } from "react";
import { Plus } from "lucide-react";
import { Btn, Heading } from "../../components/ui/index.js";
import { useEscape } from "../../hooks/useEscape.js";
import { paise, uid } from "../../utils/format.js";
import DishCatalog from "./sections/DishCatalog.jsx";
import DishFormModal from "./sections/DishFormModal.jsx";
import MenuStats from "./sections/MenuStats.jsx";

export default function Menu({ s, save, notify }) {
  const [q, setQ] = useState(""),
    [modal, setModal] = useState(false),
    [edit, setEdit] = useState(null);
  const fresh = () => ({
    name: "",
    category: s.categories[0] || "",
    type: "veg",
    available: true,
    variants: [{ name: "Full", price: "" }],
  });
  const [form, setForm] = useState(fresh());
  const open = (d) => {
    setEdit(d?.id || "new");
    setForm(
      d
        ? {
            ...d,
            variants: (d.variants || []).map((v) => ({
              ...v,
              price: v.pricePaise / 100,
            })),
          }
        : fresh(),
    );
    setModal(true);
  };
  useEscape(modal, () => setModal(false));
  const submit = async () => {
    if (
      !form.name.trim() ||
      !form.variants.length ||
      form.variants.some(
        (v) => !String(v.name || "").trim() || !Number.isFinite(Number(v.price)) || Number(v.price) < 0 || v.price === "",
      )
    )
      return notify("Complete dish and variant fields", "error");
    if (!form.category) return notify("Create a category first (Manage → Categories)", "error");
    const norm = (x) => String(x || "").trim().replace(/\s+/g, " ").toLowerCase();
    const dup = s.dishes.find((x) => x.id !== form.id && norm(x.name) === norm(form.name));
    if (dup)
      return notify("A dish named “" + dup.name + "” already exists (" + (dup.category || "no category") + "). Use a different name, e.g. add the size or style.", "error");
    const names = form.variants.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      return notify("Each variant needs a different name", "error");
    const d = {
      ...form,
      name: form.name.trim().replace(/\s+/g, " "),
      id: edit === "new" ? "dish-" + uid() : form.id,
      variants: form.variants.map((v) => ({
        name: v.name.trim(),
        pricePaise: paise(v.price),
      })),
    };
    delete d.price;
    const ok = await save(
      "dishes",
      edit === "new"
        ? [...s.dishes, d]
        : s.dishes.map((x) => (x.id === d.id ? d : x)),
    );
    if (ok) {
      setModal(false);
      notify("Dish saved");
    }
  };
  return (
    <>
      <Heading
        eyebrow="MENU MANAGEMENT"
        title="Menu & dishes"
        desc="Manage dishes, variants, pricing, and availability."
        action={
          <Btn primary icon={Plus} onClick={() => open(null)}>
            Add dish
          </Btn>
        }
      />
      <MenuStats s={s} />
      <DishCatalog notify={notify} open={open} q={q} s={s} save={save} setQ={setQ} />
      {modal && (
        <DishFormModal
          edit={edit}
          form={form}
          notify={notify}
          s={s}
          setForm={setForm}
          setModal={setModal}
          submit={submit}
        />
      )}
    </>
  );
}
