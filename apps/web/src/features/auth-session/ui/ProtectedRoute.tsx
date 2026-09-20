import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthSession } from "@/features/auth-session/model/AuthSessionProvider";

export function ProtectedRoute() {
  const { status, user } = useAuthSession();
  const location = useLocation();

  if (status === "loading") {
    return <main className="centered-state">여행 기록을 불러오고 있어요.</main>;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isOnboarding = location.pathname === "/onboarding";
  const needsOnboarding = !user?.nickname;
  if (needsOnboarding && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!needsOnboarding && isOnboarding) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
