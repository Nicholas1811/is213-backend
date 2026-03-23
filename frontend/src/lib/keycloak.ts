// src/lib/keycloak.ts
import Keycloak from 'keycloak-js';

const keycloakConfig = {
    url: import.meta.env.VITE_KEYCLOAK_URL || '',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || '',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || '',
};

export const isKeycloakConfigured = !!(
    keycloakConfig.url &&
    keycloakConfig.realm &&
    keycloakConfig.clientId
);

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
