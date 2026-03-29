/**
 * Mock API Client - Use this when backend is not available
 * 
 * Usage:
 * import { mockApiClient, useMockData } from './api/mockClient';
 * 
 * The useMockData() function automatically detects if backend is unavailable
 * and falls back to mock data.
 */

import { mockApiClient as mockClient } from "../mockData.js";

export { mockClient as mockApiClient };

// Helper to switch between real and mock client.
// Only use mock when explicitly enabled (VITE_USE_MOCK_DATA === "true").
export function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === "true";
}
