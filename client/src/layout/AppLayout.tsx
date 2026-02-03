import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/layout.css";

export default function AppLayout() {
  return (
    <div className="app-root">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
