import { useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Btn, Empty, Heading } from "../../components/ui/index.js";
import { fmtDateTime } from "../../utils/format.js";
import { printHtml, receiptHtml } from "../../utils/print.js";
import BillSummaryPanel from "./sections/BillSummaryPanel.jsx";
import ReceiptPreviewPanel from "./sections/ReceiptPreviewPanel.jsx";
import TransactionInfoPanel from "./sections/TransactionInfoPanel.jsx";

export default function BillDetail({ s, notify, reload, nav }) {
  const { billId } = useParams();
  const b = s.bills.find((x) => x.id === billId);
  if (!b)
    return <Empty title="Bill not found" desc="This transaction does not exist." />;
  return (
    <>
      <Heading
        eyebrow="TRANSACTION DETAILS"
        title={b.billNumber}
        desc={`Created ${fmtDateTime(b.createdAt)}`}
        action={
          <>
            <Btn icon={ArrowLeft} onClick={() => nav("/bills")}>All bills</Btn>
            <Btn primary icon={Printer} onClick={() => printHtml(s, receiptHtml(s, b), notify, "payment")}>
              Print receipt
            </Btn>
          </>
        }
      />
      <div className="columns detail">
        <BillSummaryPanel b={b} />
        <ReceiptPreviewPanel b={b} s={s} />
        <TransactionInfoPanel b={b} notify={notify} reload={reload} />
      </div>
    </>
  );
}
