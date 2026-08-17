import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import SyllabusPage from "./pages/SyllabusPage";
import LessonLogsPage from "./pages/LessonLogsPage";
import SubmissionsPage from "./pages/SubmissionsPage";

function AppShell({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/syllabus"
              element={
                <ProtectedRoute>
                  <SyllabusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lesson-logs"
              element={
                <ProtectedRoute>
                  <LessonLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/syllabus" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AuthProvider>
  );
}
