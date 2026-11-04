import { Image, Save, Trash2, X } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { errMsg } from "../../../utils/format.js";
import { readLogo } from "../../../utils/image.js";

export default function DishFormModal({
  edit,
  form,
  notify,
  s,
  setForm,
  setModal,
  submit,
}) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}>
      <div className="modal">
        <div className="modal-head">
          <h3>{edit === "new" ? "Add dish" : "Edit dish"}</h3>
          <button onClick={() => setModal(false)} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="food-image-editor">
          <div className="food-image-preview">{form.imageDataUrl ? <img src={form.imageDataUrl} alt="Food preview" /> : <Image size={28} />}</div>
          <div><b>Food photo</b><small>Choose a clear photo. It is saved with this dish on this computer.</small><label className="btn food-upload">{form.imageDataUrl ? "Change image" : "Upload food image"}<input type="file" accept="image/*" hidden onChange={async e => { const f=e.target.files?.[0]; e.target.value=""; if(!f)return; try { setForm({...form,imageDataUrl:await readLogo(f, "photo")}); } catch(err) { notify(errMsg(err),"error"); } }} /></label>{form.imageDataUrl && <button className="text-btn danger" onClick={()=>setForm({...form,imageDataUrl:""})}>Remove image</button>}</div>
        </div>
        <label className="field-label">
          Dish name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field-label">
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {!s.categories.includes(form.category) && form.category && (
              <option key={form.category}>{form.category}</option>
            )}
            {s.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Food type
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-vegetarian</option>
          </select>
        </label>
        <b className="form-subhead">Serving variants</b>
        {form.variants.map((v, i) => (
          <div className="variant-form" key={i}>
            <input
              placeholder="Variant"
              value={v.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  variants: form.variants.map((x, j) =>
                    i === j ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Price ₹"
              value={v.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  variants: form.variants.map((x, j) =>
                    i === j ? { ...x, price: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              aria-label="Remove variant"
              title="Remove variant"
              onClick={() =>
                setForm({
                  ...form,
                  variants: form.variants.filter((_, j) => j !== i),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          className="text-btn"
          onClick={() =>
            setForm({
              ...form,
              variants: [...form.variants, { name: "", price: "" }],
            })
          }
        >
          + Add variant
        </button>
        <label className="check-field">
          <input
            type="checkbox"
            checked={form.available !== false}
            onChange={(e) =>
              setForm({ ...form, available: e.target.checked })
            }
          />{" "}
          Available for ordering
        </label>
        <div className="modal-actions">
          <Btn onClick={() => setModal(false)}>Cancel</Btn>
          <Btn primary icon={Save} onClick={submit}>
            Save dish
          </Btn>
        </div>
      </div>
    </div>
  );
}
