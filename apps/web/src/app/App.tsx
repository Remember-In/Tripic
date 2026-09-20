import { Navigate, Route, Routes } from "react-router-dom";

import { AppProviders } from "@/app/providers/AppProviders";
import { ProtectedRoute } from "@/features/auth-session/ui/ProtectedRoute";
import { KakaoCallbackPage } from "@/pages/auth-callback/KakaoCallbackPage";
import { HomePage } from "@/pages/home/HomePage";
import { LoginPage } from "@/pages/login/LoginPage";
import { RecordDetailPage } from "@/pages/record-detail/RecordDetailPage";
import { RecordCreatePage } from "@/pages/record-create/RecordCreatePage";
import { RecordsPage } from "@/pages/records/RecordsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { AppShell } from "@/widgets/app-shell/AppShell";

export function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="records/new" element={<RecordCreatePage />} />
            <Route path="records/:recordId" element={<RecordDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}
