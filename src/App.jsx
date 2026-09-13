import RepairOrderPage from "./pages/RepairOrderPage";
import { CatalogProvider } from "./context/CatalogContext";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <RepairOrderPage /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <RepairOrderPage />
      </CatalogProvider>
    </AuthProvider>
  );
}
