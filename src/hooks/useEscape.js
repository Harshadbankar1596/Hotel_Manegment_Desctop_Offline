import { useEffect, useRef } from "react";

/* Close a modal / popup with the Escape key */
export function useEscape(active, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const k = (e) => e.key === "Escape" && ref.current();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [active]);
}
