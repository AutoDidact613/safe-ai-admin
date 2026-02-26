import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import GroupPromptsPage from '../features/FilterManagement/GroupPromptsPage';
import AddPromptPage from '../features/FilterManagement/AddPromptPage';
import EditPromptPage from '../features/FilterManagement/EditPromptPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />

        
          <Route path="groups">
              כשנכנסים רק ל-groups רואים את הטבלה
              <Route index element={<GroupPromptsPage />} />
              
           
              <Route path="add-prompt" element={<AddPromptPage />} />
              <Route path="edit-prompt/:id" element={<EditPromptPage />} />
          </Route>
      

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}