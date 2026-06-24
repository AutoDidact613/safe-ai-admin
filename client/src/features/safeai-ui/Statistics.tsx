import { useAuth } from "../../context/AuthContext";
import AdminStatistics from "./AdminStatistics";
import UserStatistics from "./UserStatistics";

interface StatisticsProps {
  user: {
    email: string;
    name: string;
    _id?: string;
    role?: string;
  } | null;
}

export default function Statistics({ user }: StatisticsProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin" || user?.role === "admin";
  return isAdmin ? <AdminStatistics /> : <UserStatistics />;
}
