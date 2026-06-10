import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/** Bloqueia rotas internas: sem usuário → redireciona para /login. */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader label="Carregando…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
