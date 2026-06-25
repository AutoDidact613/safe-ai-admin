import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import SafeAIUIPage from "../pages/SafeAIUIPage";
import NotFound from "../pages/NotFound";
import OrganizationUsersPage from "../pages/OrganizationUsersPage";
import AdminOrganizationsPage from "../pages/AdminOrganizationsPage";
import ContactPage from "../pages/ContactPage";
import DocsPage from "../pages/DocsPage";
import RecommendedGuidesPage from "../pages/RecommendedGuidesPage";
import CoursesPage from "../pages/CoursesPage";
import ActivityLogPage from "../pages/ActivityLogPage";
import AboutPage from "../pages/AboutPage";
import LoginForm from "../features/auth/LoginForm";
import RegisterForm from "../features/auth/RegisterForm";
import ApiKeyDisplay from "../features/auth/ApiKeyDisplay";
import EmailVerification from "../features/auth/EmailVerification";
import ForgotPassword from "../features/auth/ForgotPassword";
import ResetPassword from "../features/auth/ResetPassword";
import RegisterFormSuccess from "../features/auth/RegisterFormSuccess";
import TopNavigation from "../components/TopNavigation";
import BetaBanner from "../components/BetaBanner";
import PaymentPage from "../pages/PaymentPage";
import PaymentSuccessPage from "../pages/PaymentSuccessPage";
import PaymentFailPage from "../pages/PaymentFailPage";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  const user = localStorage.getItem("user");

  // Only redirect if user has valid tokens AND user data
  // This prevents redirect during registration when tokens don't exist yet
  if (accessToken && refreshToken && user) {
    return <Navigate to="/safeai-ui" replace />;
  }

  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      {/* Global Top Navigation */}
      <TopNavigation />

      {/* Beta Banner */}
      <BetaBanner />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterForm />
            </PublicRoute>
          }
        />
        <Route
          path="/register-success"
          element={
            <PublicRoute>
              <RegisterFormSuccess />
            </PublicRoute>
          }
        />

        <Route path="/verify-email/:token" element={<EmailVerification />} />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/api-key-display"
          element={
            <ProtectedRoute>
              <ApiKeyDisplay />
            </ProtectedRoute>
          }
        />

        <Route
          path="/safeai-ui"
          element={
            <ProtectedRoute>
              <SafeAIUIPage />
            </ProtectedRoute>
          }
        />

        {/* Organization Routes */}
        <Route
          path="/organization/users"
          element={
            <ProtectedRoute>
              <OrganizationUsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute>
              <AdminOrganizationsPage />
            </ProtectedRoute>
          }
        />

        {/* New Pages Routes */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/recommended-guides" element={<RecommendedGuidesPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />

        {/* Payment Routes */}
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
        <Route path="/payment/fail" element={<ProtectedRoute><PaymentFailPage /></ProtectedRoute>} />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
