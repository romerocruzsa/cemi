import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { PublicClientApplication, AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig } from "../config/msalConfig";
import { apiClient } from "../api/client";

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

const API_SCOPE = import.meta.env.VITE_API_SCOPE || "";

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isValidDomain: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAIL_DOMAIN = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || "").trim().toLowerCase();
export const allowedEmailDomainLabel = ALLOWED_EMAIL_DOMAIN
  ? `@${ALLOWED_EMAIL_DOMAIN}`
  : "";

// In local development we don't want to block on domain so you can
// verify the full login → workspace flow even with a non-production account.
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

function isEmailFromAllowedDomain(email: string): boolean {
  if (isLocalhost || !ALLOWED_EMAIL_DOMAIN) {
    // Relax domain restriction in dev, and skip it entirely unless configured.
    return true;
  }
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidDomain, setIsValidDomain] = useState(false);

  useEffect(() => {
    // Initialize MSAL
    msalInstance
      .initialize()
      .then(() => {
        // Check if user is already logged in
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const account = accounts[0];
          const email = account.username || "";
          const valid = isEmailFromAllowedDomain(email);

          setUser(account);
          setIsAuthenticated(true);
          setIsValidDomain(valid);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("MSAL initialization error:", error);
        setIsLoading(false);
      });
  }, []);

  // Wire API client to use Bearer token when authenticated (for cloud backend)
  useEffect(() => {
    if (!isAuthenticated || !user || !API_SCOPE) {
      apiClient.setTokenGetter(async () => null);
      return;
    }
    apiClient.setTokenGetter(async () => {
      try {
        const result = await msalInstance.acquireTokenSilent({
          scopes: [API_SCOPE],
          account: user,
        });
        return result?.accessToken ?? null;
      } catch {
        return null;
      }
    });
  }, [isAuthenticated, user]);

  const login = async () => {
    try {
      setIsLoading(true);
      const loginRequest = {
        scopes: ["openid", "profile", "email"],
      };

      const response: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
      const email = response.account?.username || "";
      const valid = isEmailFromAllowedDomain(email);

      setUser(response.account);
      setIsAuthenticated(true);
      setIsValidDomain(valid);

      // If domain is invalid (production only), clear the account silently
      if (!valid) {
        await msalInstance.removeAccount(response.account);
        setUser(null);
        setIsAuthenticated(false);
        setIsValidDomain(false);
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await msalInstance.logoutPopup({
          account: accounts[0],
        });
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsValidDomain(false);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setIsValidDomain(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        isLoading,
        isValidDomain,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

