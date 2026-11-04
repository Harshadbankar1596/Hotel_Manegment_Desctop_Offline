import { useEffect, useState } from "react";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { Btn } from "../../../components/ui/index.js";
import { DEFAULT_COLORS, PRESETS, buildPalette, isHex, sameColors, sanitize } from "../../../utils/theme.js";

function RatioBar({ c, small }) {
  return (
    <div className={"ratio-bar" + (small ? " sm" : "")} aria-hidden="true">
      <i style={{ flex: 6, background: c.main }} />
      <i style={{ flex: 3, background: c.secondary }} />
      <i style={{ flex: 1, background: c.accent }} />
    </div>
  );
}
function MiniPreview({ colors, mode, label }) {
  const p = buildPalette(colors, mode);
  return (
    <div>
      <p className="tp-cap">{label}</p>
      <div className="tp" style={p}>
        <div className="tp-side">
          <span className="on">Tables</span>
          <span>Menu</span>
          <span>Bills</span>
        </div>
        <div className="tp-main">
          <h4>Table T5</h4>
          <div className="tp-card"><span>Paneer Masala</span><b>₹280</b></div>
          <div className="tp-card"><span>Butter Naan</span><b>₹45</b></div>
          <span className="tp-btn">Pay ₹325</span>
        </div>
      </div>
    </div>
  );
}
export default function ThemeSection({ theme, setTheme, colors, setColors, notify }) {
  const cur = sanitize(colors || DEFAULT_COLORS);
  const [hex, setHex] = useState(cur);
  useEffect(() => setHex(cur), [colors]);
  const set = (k, v) => {
    setHex((h) => ({ ...h, [k]: v }));
    if (isHex(v)) setColors(sameColors({ ...cur, [k]: v }, DEFAULT_COLORS) ? null : { ...cur, [k]: v });
  };
  const rows = [
    ["main", "Main color", "60%", "Page background, the canvas behind everything. Pick a calm shade."],
    ["secondary", "Secondary color", "30%", "Top bar, cards, order panel and pop-ups."],
    ["accent", "Accent color", "10%", "Buttons, active menu, prices and highlights. Pick your brand color."],
  ];
  return (
    <>
      <p className="settings-intro">
        Choose any 3 colors using the <b>60-30-10 rule</b>: 60% main, 30% secondary, 10% accent. The whole app changes instantly, and
        Dark mode is created automatically from the same colors.
      </p>
      <b className="form-subhead">Quick picks</b>
      <div className="theme-presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className={"theme-preset" + (sameColors(p.colors, cur) ? " on" : "")}
            onClick={() => {
              setColors(sameColors(p.colors, DEFAULT_COLORS) ? null : p.colors);
              notify("Theme: " + p.name);
            }}
          >
            <RatioBar c={p.colors} small />
            {p.name}
          </button>
        ))}
      </div>
      <b className="form-subhead">Your own colors</b>
      <RatioBar c={cur} />
      <div className="color-rows">
        {rows.map(([k, title, pct, hint]) => (
          <div className="color-row" key={k}>
            <label className="swatch" style={{ background: cur[k] }} title="Click to choose a color">
              <input type="color" value={cur[k]} onChange={(e) => set(k, e.target.value)} aria-label={title} />
            </label>
            <div>
              <b>{title} <em>{pct}</em></b>
              <small>{hint}</small>
            </div>
            <input
              type="text"
              value={hex[k]}
              maxLength={7}
              onChange={(e) => set(k, e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value)}
              aria-label={title + " hex code"}
            />
          </div>
        ))}
      </div>
      <b className="form-subhead">Mode</b>
      <div className="seg" role="group" aria-label="Light or dark">
        <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><Sun size={15} /> Light</button>
        <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><Moon size={15} /> Dark</button>
      </div>
      <b className="form-subhead">Preview</b>
      <div className="theme-previews">
        <MiniPreview colors={cur} mode="light" label="Light mode" />
        <MiniPreview colors={cur} mode="dark" label="Dark mode (automatic)" />
      </div>
      <p className="warning-note">
        Text colors are picked automatically so everything stays readable. Paid / pending / error colors stay the same on purpose. Saved on this computer.
      </p>
      <Btn icon={RefreshCw} onClick={() => { setColors(null); notify("Theme reset to default"); }}>Reset to default</Btn>
    </>
  );
}
