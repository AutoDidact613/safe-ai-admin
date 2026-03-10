import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import TasksList from "../features/tasks/TasksList";
import AddTask from "../features/tasks/AddTask";
import UpdateTask from "../features/tasks/UpdateTask";
import TableView from "../features/tabl_data/TableView";
import GrafsCompo from "../features/data-history/GrafsCompo";
// import SafeFilterAdmin from "../pages/FilterAdminPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />
          <Route path="/tasks" element={<TasksList />} />
          <Route path="/add-task" element={<AddTask />} />
          <Route path="/edit-task/:id" element={<UpdateTask />} />
          <Route path="/tabl_data" element={<TableView/>}/>
          <Route path="/data-history" element={<GrafsCompo/>}/>
          {/* <Route path="/filter-admin" element={<SafeFilterAdmin />} /> */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
