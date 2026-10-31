/* Theme engine: 3 user colours -> full light + dark palette using the 60-30-10 rule.
 *   60%  main      -> page background (the canvas everything sits on)
 *   30%  secondary -> top bar, cards, panels, order cart, popups
 *   10%  accent    -> buttons, active tab, prices, highlights
 * Status colours (paid / pending / error) stay fixed on purpose so meaning never changes.
 */
export const DEFAULT_COLORS = { main: "#f4f3ef", secondary: "#ffffff", accent: "#0f6b52" };

export const PRESETS = [
  { name: "Emerald", colors: DEFAULT_COLORS },
  { name: "Ocean", colors: { main: "#eef3fa", secondary: "#ffffff", accent: "#1d5fd1" } },
  { name: "Ruby", colors: { main: "#faf1f1", secondary: "#fffafa", accent: "#c0262d" } },
  { name: "Sunset", colors: { main: "#fbf3ea", secondary: "#fff8f0", accent: "#e0670d" } },
  { name: "Royal", colors: { main: "#f3f0fa", secondary: "#ffffff", accent: "#6a3fd0" } },
  { name: "Midnight", colors: { main: "#e9edf2", secondary: "#1f2a37", accent: "#18a999" } },
];

const clamp = (n, a = 0, b = 255) => Math.min(b, Math.max(a, n));
export const isHex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));
const toRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) => "#" + rgb.map((n) => clamp(Math.round(n)).toString(16).padStart(2, "0")).join("");
/* mix(a,b,t): t=0 -> a, t=1 -> b */
export const mix = (a, b, t) => {
  const x = toRgb(a), y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const lum = (hex) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const isLight = (hex) => lum(hex) > 0.4;
/* best readable text colour on a background */
const inkOn = (bg) => (contrast(bg, "#10151a") >= contrast(bg, "#ffffff") ? "#10151a" : "#ffffff");
/* nudge a colour until it reaches the wanted contrast against bg */
const ensureContrast = (color, bg, min) => {
  const toward = isLight(bg) ? "#000000" : "#ffffff";
  let c = color;
  for (let i = 0; i < 20 && contrast(c, bg) < min; i++) c = mix(c, toward, 0.08);
  return c;
};

export function sanitize(colors) {
  const c = { ...DEFAULT_COLORS, ...(colors || {}) };
  for (const k of Object.keys(DEFAULT_COLORS)) if (!isHex(c[k])) c[k] = DEFAULT_COLORS[k];
  return c;
}
export const sameColors = (a, b) => ["main", "secondary", "accent"].every((k) => String(a?.[k]).toLowerCase() === String(b?.[k]).toLowerCase());

export function buildPalette(input, mode = "light") {
  const { main, secondary, accent } = sanitize(input);
  const dark = mode === "dark";
  /* 60%: page background */
  const bg = dark ? mix(main, "#000000", 0.88) : main;
  const ink = inkOn(bg);
  const text = dark ? "#eef2ef" : mix(ink, accent, 0.06);
  /* 30%: top bar, cards, panels, order cart, popups. Always the user's secondary color. */
  const surface = dark
    ? isLight(secondary) ? mix(secondary, "#000000", 0.82) : mix(secondary, "#000000", 0.25)
    : secondary;
  const sText = dark ? "#eef2ef" : mix(inkOn(surface), accent, 0.06);
  const sMuted = mix(sText, surface, dark ? 0.4 : 0.42);
  const sLine = mix(surface, sText, dark ? 0.16 : 0.12);
  const sLine2 = mix(surface, sText, dark ? 0.26 : 0.22);
  const s2 = mix(surface, sText, dark ? 0.05 : 0.035);
  /* 10%: accent -> buttons, active tab, prices, highlights */
  const brand = ensureContrast(dark ? mix(accent, "#ffffff", 0.18) : accent, surface, dark ? 4.5 : 3.2);
  return {
    "--bg": bg,
    "--surface": surface,
    "--surface-2": mix(bg, surface, 0.5),
    "--line": mix(bg, text, dark ? 0.16 : 0.1),
    "--line-2": mix(bg, text, dark ? 0.26 : 0.2),
    "--text": text,
    "--muted": mix(text, bg, dark ? 0.4 : 0.42),
    /* text + lines used INSIDE surface-coloured areas (see the scope rule in styles.css) */
    "--s-text": sText,
    "--s-muted": sMuted,
    "--s-line": sLine,
    "--s-line-2": sLine2,
    "--s-2": s2,
    "--brand": brand,
    "--brand-2": mix(brand, dark ? "#ffffff" : "#000000", 0.14),
    "--brand-soft": mix(surface, brand, dark ? 0.22 : 0.13),
    "--gold": brand,
    "--on-brand": inkOn(brand),
    "--side": surface,
    "--side-text": sText,
    "--side-muted": sMuted,
    "--side-hover": s2,
    "--side-line": sLine,
  };
}

/* Apply (or clear) the custom palette on <html>. colors === null -> built-in default CSS. */
export function applyTheme(colors, mode) {
  const root = document.documentElement;
  const keys = Object.keys(buildPalette(DEFAULT_COLORS, "light"));
  keys.forEach((k) => root.style.removeProperty(k));
  root.dataset.theme = mode;
  if (!colors) return;
  const p = buildPalette(colors, mode);
  keys.forEach((k) => root.style.setProperty(k, p[k]));
  root.style.setProperty("color-scheme", mode);
}
