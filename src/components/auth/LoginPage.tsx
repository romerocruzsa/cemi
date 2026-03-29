import { useEffect } from "react";
import { allowedEmailDomainLabel, useAuth } from "../../contexts/AuthContext";
import capicuLogo from "../../assets/bc28cd3b23be4b191421f0ead27bb2b9b7c23ff5.png";

interface LoginPageProps {
  onNavigateToWorkspace?: () => void;
}

export function LoginPage({ onNavigateToWorkspace }: LoginPageProps) {
  const { login, isAuthenticated, isValidDomain, isLoading, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && isValidDomain && onNavigateToWorkspace) {
      onNavigateToWorkspace();
    }
  }, [isAuthenticated, isValidDomain, onNavigateToWorkspace]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <main className="flex items-center justify-center w-full px-4 min-h-screen bg-[#F9F5EA]">
      <div className="w-72 shadow-lg p-8">
        <form
          className="flex w-full flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
        <div className="mb-4" title="CEMI">
          <img src={capicuLogo} alt="Capicú" className="h-10" />
        </div>

        <h2 className="text-4xl font-medium text-[#0F3455]">Sign in</h2>

        <p className="mt-4 mb-4 text-base text-[#0F3455]/70">
          Please enter email and password to access.
        </p>

        {isLoading ? (
          <div className="mt-10 text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D82A2D]"></div>
            <p className="mt-4 text-[#0F3455]/70">Loading...</p>
          </div>
        ) : isAuthenticated && !isValidDomain ? (
          <div className="mt-10">
            <div className="text-center py-8">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-[#D82A2D]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F3455] mb-2">
                Access Denied
              </h3>
              <p className="text-[#0F3455]/70 mb-4">
                Your email address ({user?.username}) is not authorized to access this platform.
              </p>
              {allowedEmailDomainLabel ? (
                <p className="text-sm text-[#0F3455]/60">
                  Only users with <span className="font-semibold text-[#D82A2D]">{allowedEmailDomainLabel}</span>{" "}
                  email addresses can access this platform.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <label className="font-medium text-[#0F3455]">Email</label>
              <input
                placeholder=" Please enter your email"
                className="mt-2 mb-2 border border-[#0F3455]/20 ring ring-[#0F3455]/20 focus:ring-2 focus:ring-[#D82A2D] outline-none px-3 py-3 w-full"
                required
                type="email"
                name="email"
              />
            </div>

            <div className="mt-6">
              <label className="font-medium text-[#0F3455]">Password</label>
              <input
                placeholder=" Please enter your password"
                className="mt-2 mb-4 border border-[#0F3455]/20 ring ring-[#0F3455]/20 focus:ring-2 focus:ring-[#D82A2D] outline-none px-3 py-3 w-full"
                required
                type="password"
                name="password"
              />
            </div>

            <button
              type="submit"
              onClick={handleLogin}
              disabled={isLoading}
              className="mt-8 py-3 w-full cursor-pointer bg-[#D82A2D] text-[#F9F5EA] transition hover:bg-[#D82A2D]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login
            </button>

            <div className="mt-4 pt-4 border-t border-[#0F3455]/10">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3 cursor-pointer bg-[#0078d4] border border-[#0078d4] text-white transition hover:bg-[#0078d4]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                </svg>
                Sign in with Microsoft
              </button>
            </div>
          </>
        )}
        </form>
      </div>
    </main>
  );
}


