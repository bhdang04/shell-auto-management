import RepairOrderPage from "./pages/RepairOrderPage";
import { CatalogProvider } from "./context/CatalogContext";
import "./index.css";

export default function App() {
  console.log("URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("KEY starts with:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 12));
  return (
    <CatalogProvider>
      <RepairOrderPage />
    </CatalogProvider>
  );
}
