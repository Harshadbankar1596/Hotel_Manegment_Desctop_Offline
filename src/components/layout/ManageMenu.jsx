import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { manageLinks } from "../../constants/navigation.js";

export default function ManageMenu({ nav, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);
  const inManage = manageLinks.some(([to]) => pathname === to || pathname.startsWith(to + "/"));
  return (
    <div className="manage" ref={ref}>
      <button className={"manage-btn" + (inManage ? " on" : "")} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <LayoutGrid size={16} /> Manage <ChevronDown size={14} />
      </button>
      {open && (
        <div className="manage-pop" role="menu">
          {manageLinks.map(([to, label, Icon]) => (
            <button key={to} role="menuitem" onClick={() => nav(to)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
