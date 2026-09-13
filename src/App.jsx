import Login from "./components/Login";
import RepairOrderPage from "./pages/RepairOrderPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./index.css";

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <RepairOrderPage /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}