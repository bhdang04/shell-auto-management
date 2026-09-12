import RepairOrderPage from "./pages/RepairOrderPage";
import { CatalogProvider } from "./context/CatalogContext";
import "./index.css";

export default function App() {
  return (
    <CatalogProvider>
      <RepairOrderPage />
    </CatalogProvider>
  );
}
