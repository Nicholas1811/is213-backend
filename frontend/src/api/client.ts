import axios from "axios";

// Create a shared Axios instance
// The Keycloak token interceptor will be attached in App.tsx
// after the Keycloak provider initializes
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or unauthorized - Keycloak should handle refresh
      console.warn("[API] Unauthorized - token may be expired");
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper to attach Keycloak token to requests
export function attachKeycloakToken(getToken: () => string | undefined) {
  apiClient.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
}
