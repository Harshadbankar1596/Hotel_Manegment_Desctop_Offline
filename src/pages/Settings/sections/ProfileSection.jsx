import { Image, Save, Trash2 } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { errMsg } from "../../../utils/format.js";
import { readLogo } from "../../../utils/image.js";

export default function ProfileSection({ hotel, notify, save, setHotel }) {
  const saveHotel = async () => {
    if (!String(hotel.name || "").trim()) return notify("Enter the hotel name", "error");
    if (await save("hotel", { ...hotel, name: hotel.name.trim() })) notify("Hotel profile saved");
  };
  const field = (label, key, props = {}) => (
    <label className="field-label">
      {label}
      <input value={hotel[key] || ""} onChange={(e) => setHotel({ ...hotel, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <>
      <b className="form-subhead">Hotel logo <small style={{ color: "var(--muted)", fontWeight: 400 }}>(shown in the sidebar and printed on every bill)</small></b>
      <div className="logo-edit">
        <div className="thumb">
          {hotel.logoDataUrl ? <img src={hotel.logoDataUrl} alt="Hotel logo" /> : <Image size={26} />}
        </div>
        <div className="btns">
          <label className="btn" style={{ cursor: "pointer" }}>
            <Image size={15} /> {hotel.logoDataUrl ? "Change logo" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setHotel({ ...hotel, logoDataUrl: await readLogo(f) });
                  notify("Logo ready — click “Save profile” to apply");
                } catch (er) {
                  notify(errMsg(er), "error");
                }
              }}
            />
          </label>
          {hotel.logoDataUrl && (
            <button className="btn danger-btn" onClick={() => setHotel({ ...hotel, logoDataUrl: "" })}>
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      </div>
      {field("Hotel name", "name")}
      {field("Phone number", "phone")}
      {field("Email address", "email", { type: "email" })}
      {field("GSTIN", "gstin")}
      <label className="field-label">
        Address
        <textarea value={hotel.address || ""} onChange={(e) => setHotel({ ...hotel, address: e.target.value })} />
      </label>
      {field("Receipt footer", "footer")}
      <Btn primary icon={Save} onClick={saveHotel}>Save profile</Btn>
    </>
  );
}
