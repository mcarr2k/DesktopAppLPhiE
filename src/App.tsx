import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/router";
import { useAuthStore } from "@/stores/authStore";
import { ToastViewport } from "@/components/ui/Toast";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { envValid } from "@/lib/env";
import SetupNeeded from "@/routes/SetupNeeded";

export default function App() {
  if (!envValid) return <SetupNeeded />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.lphie) return;
    return window.lphie.onSignOutRequested(() => {
      signOut();
    });
  }, [signOut]);

  if (loading) return <FullPageSpinner />;

  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
