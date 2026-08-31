import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import LandingPageV2 from "../pages/LandingPageV2";
import SafeAIUIPage from "../pages/SafeAIUIPage";
import NotFound from "../pages/NotFound";
import OrganizationUsersPage from "../pages/OrganizationUsersPage";
import ContactPage from "../pages/ContactPage";
import DocsPage from "../pages/DocsPage";
import ArticlesPage from "../pages/ArticlesPage";
import ArticlePage from "../pages/ArticlePage";
import AdminArticlesPage from "../pages/AdminArticlesPage";
import RecommendedGuidesPage from "../pages/RecommendedGuidesPage";
import CoursesPage from "../pages/CoursesPage";
import ActivityLogPage from "../pages/ActivityLogPage";
import AboutPage from "../pages/AboutPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import TenderBoardPage from "../pages/TenderBoardPage";
import DownloadAgentsPage from "../pages/AgentDownloadsPage";
import LoginForm from "../features/auth/LoginForm";
import RegisterForm from "../features/auth/RegisterForm";
import ApiKeyDisplay from "../features/auth/ApiKeyDisplay";
import EmailVerification from "../features/auth/EmailVerification";
import ForgotPassword from "../features/auth/ForgotPassword";
import ResetPassword from "../features/auth/ResetPassword";
import RegisterFormSuccess from "../features/auth/RegisterFormSuccess";
import TopNavigation from "../components/TopNavigation";
import BetaBanner from "../components/BetaBanner";
import Footer from "../components/Footer";
import { PublicOrgOwnerSignup } from "../features/organizations/PublicOrgOwnerSignup";
import RequestDetails from "../features/safeai-ui/RequestDetails";
import AdminRequestsList from "../features/safeai-ui/AdminRequestsList";
import AiNewsPage from "../pages/AiNewsPage";
import AiNewsDetailsPage from "../pages/AiNewsDetailsPage";
import ErrorBoundary from "../components/ErrorBoundary";
import ForumPage from '../features/forum/ForumPage';
import { PostThreadPage } from '../features/forum/PostThreadPage';
import SafeAIHubHomePage from "../pages/SafeAIHubHomePage";
import SafeAIPlatformHomePage from "../pages/SafeAIPlatformHomePage";

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

const ROUTER_BASE = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, "") || "";

// The SafeAI Hub / SafeAI Platform dashboards (SCRUM-228/229) ship their own
// complete sidebar navigation — showing the global header/banner above them
// too just duplicates every link a second time. Hidden only on these two
// routes; every other page keeps the global chrome unchanged.
const ROUTES_WITHOUT_GLOBAL_CHROME = ["/safeai-hub", "/safeai-platform"];

function GlobalChrome() {
  const location = useLocation();
  if (ROUTES_WITHOUT_GLOBAL_CHROME.includes(location.pathname)) return null;
  return (
    <>
      <TopNavigation />
      <BetaBanner />
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter basename={ROUTER_BASE}>
      <GlobalChrome />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        {/* טיוטת דף בית חדש (SCRUM-227) — לתצוגה מקדימה בלבד, טרם מוחלף בנתיב הראשי */}
        <Route path="/landing-preview" element={<LandingPageV2 />} />
        <Route path="/become-org-owner" element={<PublicOrgOwnerSignup />} />

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
              <ErrorBoundary>
                <ApiKeyDisplay />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/safeai-ui"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <SafeAIUIPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/request/:id"
          element={
            <ProtectedRoute>
              <RequestDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/all-requests"
          element={
            <ProtectedRoute>
              <AdminRequestsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/forum"
          element={
            <ProtectedRoute>
              <ForumPage />
            </ProtectedRoute>
          }
        />

        {/* Sub-homepages (SCRUM-228 / SCRUM-229) — not yet linked from the
            main navigation; the SafeAI Hub / SafeAI Platform banners on
            /landing-preview stay "בעדכון" until that connection is made. */}
        <Route
          path="/safeai-hub"
          element={
            <ProtectedRoute>
              <SafeAIHubHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safeai-platform"
          element={
            <ProtectedRoute>
              <SafeAIPlatformHomePage />
            </ProtectedRoute>
          }
        />

        {/* Organization Routes */}
         <Route
          path="/ai-news"
          element={
           <ProtectedRoute>
             <AiNewsPage />
           </ProtectedRoute>
          }
        />
        <Route
          path="/ai-news/:id"
          element={
           <ProtectedRoute>
             <AiNewsDetailsPage />
           </ProtectedRoute>
          }
        />

        {/* Organization Routes */}
        <Route
          path="/organization/users"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <OrganizationUsersPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route path="/admin/organizations" element={<Navigate to="/safeai-ui" replace />} />

        <Route
          path="/admin/articles"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <AdminArticlesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />



        {/* New Pages Routes */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/docs" element={<ArticlesPage />} />
        <Route path="/docs/:slug" element={<ArticlePage />} />
        <Route path="/docs-old" element={<DocsPage />} />
        <Route path="/recommended-guides" element={<RecommendedGuidesPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/tender-board" element={<TenderBoardPage />} />
        <Route path="/download-agents" element={<DownloadAgentsPage />} />
        <Route path="/forum/post/:id" element={<ProtectedRoute><PostThreadPage /></ProtectedRoute>} />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}