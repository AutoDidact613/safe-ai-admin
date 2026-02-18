import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import { ApiList } from "../ApiKye/ApiList";
import { AddApi } from "../ApiKye/AddApi";
import { ApiDetailsPage } from "../ApiKye/ApiDetailsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />


                  <Route path="/api-keys" element={<ApiList />} />
        <Route path="/add-api" element={<AddApi onClose={() => window.history.back()} />} />
        <Route path="/api-details/:apiId" element={<ApiDetailsPage />} />
          {/* בהמשך */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
