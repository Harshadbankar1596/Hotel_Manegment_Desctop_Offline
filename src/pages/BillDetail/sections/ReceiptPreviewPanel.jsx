import { Panel } from "../../../components/ui/index.js";
import { receiptHtml } from "../../../utils/print.js";

export default function ReceiptPreviewPanel({ b, s }) {
  return (
    <Panel title="Receipt preview" desc="Exactly what is printed for the customer">
      <iframe className="receipt-frame" title="Receipt preview" sandbox="" srcDoc={receiptHtml(s, b)} />
    </Panel>
  );
}
