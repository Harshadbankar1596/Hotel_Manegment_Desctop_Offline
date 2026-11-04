import { useParams } from "react-router-dom";
import Billing from "./Billing.jsx";

export default function BillingRoute(props) {
  const { tableId } = useParams();
  return <Billing key={tableId} tableId={tableId} {...props} />;
}
