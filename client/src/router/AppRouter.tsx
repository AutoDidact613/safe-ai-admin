import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import SafeFilterAdmin from "../pages/FilterAdminPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />

          {/* בהמשך */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}
          <Route path="/filter-admin" element={<SafeFilterAdmin />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
