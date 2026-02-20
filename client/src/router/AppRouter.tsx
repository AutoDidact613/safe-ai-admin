import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import TableView from "../features/tabl_data/TableView";
import GrafsCompo from "../features/data-history/GrafsCompo";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />
          <Route path="/tabl_data" element={<TableView/>}/>
          <Route path="/data-history" element={<GrafsCompo/>}/>
          {/* בהמשך */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
