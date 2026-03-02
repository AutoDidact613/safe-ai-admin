import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import HomePage from "../pages/HomePage";
import ExamplePage from "../features/example/ExamplePage";
import NotFound from "../pages/NotFound";
import InquiriesList from "../features/Inquiries/InquiriesList";
import AddInquiries from "../features/Inquiries/AddInquiries";
import InquiriesDetails from "../features/Inquiries/InquiriesDetails";
import UpdateInquiries from "../features/Inquiries/UpdateInquiries";
import DeleteInquiries from "../features/Inquiries/DeleteInquiries";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />
          <Route path="/inquiry-list" element={<InquiriesList />} />
          <Route path="/inquiry-add" element={<AddInquiries />} />
          <Route path="/inquiry-details" element={<InquiriesDetails />} />
          <Route path="/inquiry-update" element={<UpdateInquiries />} />
          <Route path="/inquiry-delete" element={<DeleteInquiries />} />
          

          {/* בהמשך */}
          {/* <Route path="/users" element={<UsersPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
