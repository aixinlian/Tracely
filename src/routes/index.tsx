import { createHashRouter, Navigate } from "react-router";
import App from "@/App";
import DailyReport from "@/pages/Daily";
import ProjectManagement from "@/pages/Project";
import History from "@/pages/History";
import Settings from "@/pages/Settings";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/daily-report" replace /> },
      { path: "daily-report", element: <DailyReport /> },
      { path: "projects", element: <ProjectManagement /> },
      { path: "history", element: <History /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
