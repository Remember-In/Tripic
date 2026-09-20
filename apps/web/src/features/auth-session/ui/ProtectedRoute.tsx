import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthSession } from "@/features/auth-session/model/AuthSessionProvider";

export function ProtectedRoute() {
  const { status } = useAuthSession();
  const location = useLocation();

  if (status === "loading") {
    return <main className="centered-state">여행 기록을 불러오고 있어요.</main>;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
