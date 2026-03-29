import { Configuration } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "";

if (!clientId || !tenantId) {
  console.warn(
    "Azure AD configuration missing. Please set VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID environment variables."
  );
}

// Get the redirect URI based on current origin so dev ports (3000, 3001, etc.)
// and hosted deployments all send users back to the right /login.
const getRedirectUri = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:5173/login";
  }
  return `${window.location.origin}/login`;
};

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: getRedirectUri(),
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

