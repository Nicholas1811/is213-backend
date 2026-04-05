import type { KeycloakInstance, KeycloakLoginOptions } from "keycloak-js";

let loginInFlight = false;

export async function startKeycloakLogin(
  keycloak: KeycloakInstance,
  options?: KeycloakLoginOptions,
): Promise<void> {
  if (loginInFlight) return;

  loginInFlight = true;

  try {
    await keycloak.login(options);
  } catch (error) {
    loginInFlight = false;
    throw error;
  }
}

export function resetKeycloakLoginGuard(): void {
  loginInFlight = false;
}
