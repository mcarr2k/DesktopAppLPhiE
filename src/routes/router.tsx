import { createHashRouter, Outlet } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { RequireAuth, RequireEboard, RequireRole } from "./guards";

import Home from "./shared/Home";
import CalendarPage from "./shared/Calendar";
import DirectoryPage from "./shared/Directory";
import MinutesArchive from "./shared/MinutesArchive";
import Profile from "./shared/Profile";

import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";

import PresidentDashboard from "./dashboards/PresidentDashboard";
import VPInternalDashboard from "./dashboards/VPInternalDashboard";
import VPExternalDashboard from "./dashboards/VPExternalDashboard";
import TreasurerDashboard from "./dashboards/TreasurerDashboard";
import SecretaryDashboard from "./dashboards/SecretaryDashboard";

function ProtectedShell() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

function EboardOnly() {
  return (
    <RequireEboard>
      <Outlet />
    </RequireEboard>
  );
}

export const router = createHashRouter([
  { path: "/auth/signin", element: <SignIn /> },
  { path: "/auth/signup", element: <SignUp /> },
  {
    element: <ProtectedShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/calendar", element: <CalendarPage /> },
      { path: "/directory", element: <DirectoryPage /> },
      { path: "/minutes", element: <MinutesArchive /> },
      { path: "/profile", element: <Profile /> },
      { path: "*", element: <Home /> },
      {
        element: <EboardOnly />,
        children: [
          {
            path: "/dashboard/president",
            element: (
              <RequireRole role="president">
                <PresidentDashboard />
              </RequireRole>
            ),
          },
          {
            path: "/dashboard/vp-internal",
            element: (
              <RequireRole role={["vp_internal", "president"]}>
                <VPInternalDashboard />
              </RequireRole>
            ),
          },
          {
            path: "/dashboard/vp-external",
            element: (
              <RequireRole role={["vp_external", "president"]}>
                <VPExternalDashboard />
              </RequireRole>
            ),
          },
          {
            path: "/dashboard/treasurer",
            element: (
              <RequireRole role={["treasurer", "president"]}>
                <TreasurerDashboard />
              </RequireRole>
            ),
          },
          {
            path: "/dashboard/secretary",
            element: (
              <RequireRole role={["secretary", "president"]}>
                <SecretaryDashboard />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
]);
