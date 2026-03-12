import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import NotificationManager from "./components/NotificationManager";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import NotificationToast from "./components/NotificationToast.tsx";
import keycloak from "./keycloak/keycloak.ts";
import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web";

type ToastMessage = {
  title?: string;
  body?: string;
};

function AuthActions() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return <p>Loading authentication...</p>;
  }

  if (keycloak.authenticated) {
    return (
      <div className="card">
        <p>Signed in as {keycloak.tokenParsed?.preferred_username}</p>
        <button onClick={() => keycloak.logout()}>Logout</button>
      </div>
    );
  }

  return (
    <div className="card">
      <button onClick={() => keycloak.login()}>Login</button>
      <button
        onClick={() => keycloak.register()}
        style={{ marginLeft: "0.75rem" }}
      >
        Register
      </button>
    </div>
  );
}

function App() {
  const [showToast, setShowToast] = useState<ToastMessage | null>(null);
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
      setShowToast({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
    return unsubscribe;
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {showToast && (
          <NotificationToast
            message={showToast}
            onClose={() => setShowToast(null)}
          />
        )}
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React</h1>
        <AuthActions />
        <NotificationManager />
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
      </>
    </ReactKeycloakProvider>
  );
}

export default App;
