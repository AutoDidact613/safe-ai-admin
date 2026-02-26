import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import PromptList from "../features/prompts/pages/PromptList";
import AddPrompt from "../features/prompts/pages/AddPrompt";
import PromptDetails from "../features/prompts/pages/PromptDetails";
import UpdatePrompt from "../features/prompts/pages/UpdatePrompt";
import VersionDetails from "../features/prompts/pages/VersionDetails";
import DeleteConfirmation from "../features/prompts/pages/DeleteConfirmation";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />
            <Route path="/promptList" element={<PromptList />} />
            <Route path="/promptDetails" element={<PromptDetails />} />
            <Route path="/addPrompt" element={<AddPrompt />} />
            <Route path="/updatePrompt" element={<UpdatePrompt />} />
            <Route path="/deleteConfirmation" element={<DeleteConfirmation />} />
            <Route path="/VersionDetails" element={<VersionDetails />} />

          {/* <Route path="/prompts" element={<PromptList />} />
          <Route path="/prompts/add" element={<AddPrompt />} />
          <Route path="/promptDetails" element={<PromptDetails />} />
          
          <Route path="/prompts/update/:id" element={<UpdatePrompt />} /> */}

          {/* בהמשך */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
