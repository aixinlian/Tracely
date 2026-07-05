import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { ReportGenerationProvider } from "@/components/report-generation-provider";
import { router } from "@/routes";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ReportGenerationProvider>
        <RouterProvider router={router} />
      </ReportGenerationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
