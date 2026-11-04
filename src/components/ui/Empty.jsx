import { FileText } from "lucide-react";

export function Empty({ title, desc }) {
  return (
    <div className="empty">
      <FileText size={24} />
      <b>{title}</b>
      <p>{desc}</p>
    </div>
  );
}
