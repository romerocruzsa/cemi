// Track page views for HubSpot
export function trackPageView(path: string, title?: string) {
  // Wait for HubSpot script to load
  if (window._hsq) {
    window._hsq.push(['setPath', path]);
    if (title) {
      window._hsq.push(['setTitle', title]);
    }
    window._hsq.push(['trackPageView']);
  }
  
  // Also track using HubSpot Conversations API if available
  if (window.hsConversationsAPI) {
    window.hsConversationsAPI.push(['trackPageView', {
      path: path,
      title: title || document.title
    }]);
  }
}

// Declare HubSpot types
declare global {
  interface Window {
    hsConversationsAPI?: any[];
    _hsq?: any[];
  }
}


