import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/auth/LoginPage";
import { MLPlatformDashboard } from "./components/cemi/MLPlatformDashboard";
import { Toaster } from "./components/ui/sonner";
import { getApiHealth, type ApiMode } from "./api/health";

/**
 * Workspace-only shell.
 *
 * Desired behavior (both localhost and production):
 * - Root `/` or `/login`: show the login screen first.
 * - After successful auth: user lands on `/workspace` (and `/workspace/*` stays in the app).
 * - Any direct `/workspace` visit without a valid session (or after logout) is redirected to `/` (landing).
 */
function CemiWorkspaceApp() {
  const auth = useAuth();
  const [path, setPath] = useState(() => window.location.pathname);
  const [apiMode, setApiMode] = useState<ApiMode>("unknown");
  const [isApiModeLoading, setIsApiModeLoading] = useState(true);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // In-app redirects (no full page reload)
  const redirectTo = useCallback((nextPath: string) => {
    window.history.replaceState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const health = await getApiHealth();
        if (!isMounted) return;
        setApiMode(health.mode);
      } finally {
        if (isMounted) {
          setIsApiModeLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  const isWorkspacePath =
    path === "/workspace" ||
    path.startsWith("/workspace/");

  // Redirect to workspace when appropriate (in-app, no full page reload)
  // Must be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (isApiModeLoading) return;
    if (path === "/" || path === "/login") {
      if (apiMode === "local") {
        redirectTo("/workspace");
      } else if (!auth.isLoading && auth.isAuthenticated && auth.isValidDomain) {
        redirectTo("/workspace");
      }
    } else if (isWorkspacePath && apiMode !== "local") {
      if (!auth.isLoading && (!auth.isAuthenticated || !auth.isValidDomain)) {
        redirectTo("/");
      }
    } else if (!path.startsWith("/workspace") && path !== "/" && path !== "/login") {
      redirectTo("/");
    }
  }, [path, apiMode, isApiModeLoading, auth.isLoading, auth.isAuthenticated, auth.isValidDomain, redirectTo, isWorkspacePath]);

  if (isApiModeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Connecting to CEMI API...</div>
      </div>
    );
  }

  // Treat root as login-first entry point.
  if (path === "/") {
    if (apiMode === "local" || (!auth.isLoading && auth.isAuthenticated && auth.isValidDomain)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground">Opening workspace...</div>
        </div>
      );
    }
    return <LoginPage onNavigateToWorkspace={() => redirectTo("/workspace")} />;
  }

  if (path === "/login") {
    if (apiMode === "local") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground">Opening workspace...</div>
        </div>
      );
    }
    return <LoginPage onNavigateToWorkspace={() => redirectTo("/workspace")} />;
  }

  if (isWorkspacePath) {
    if (apiMode === "local") {
      return <MLPlatformDashboard onNavigate={handleNavigate} />;
    }
    if (!auth.isLoading && (!auth.isAuthenticated || !auth.isValidDomain)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-foreground">Redirecting to landing...</div>
        </div>
      );
    }
    return <MLPlatformDashboard onNavigate={handleNavigate} />;
  }

  // Fallback: send to landing
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Redirecting...</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CemiWorkspaceApp />
      <Toaster />
    </AuthProvider>
  );
}
