import Keycloak from "keycloak-js";

// Setup Keycloak instance as needed
// Pass initialization options as required or leave blank to load from 'keycloak.json'
const keycloakConfig = {
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  url: import.meta.env.VITE_KEYCLOAK_URL,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
