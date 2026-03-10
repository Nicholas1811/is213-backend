package com.is213.keycloak.listener;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.util.JsonSerialization;

public class UserRegistrationEventListenerProvider implements EventListenerProvider {

    private static final Logger LOGGER = Logger.getLogger(UserRegistrationEventListenerProvider.class.getName());
    private static final String EVENT_TYPE_REGISTER = "REGISTER";

    private final KeycloakSession session;
    private final HttpClient httpClient;
    private final String callbackUrl;
    private final String eventSecret;

    public UserRegistrationEventListenerProvider(
            KeycloakSession session,
            String callbackUrl,
            String eventSecret,
            Duration timeout
    ) {
        this.session = session;
        this.callbackUrl = callbackUrl;
        this.eventSecret = eventSecret;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(timeout)
            .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    @Override
    public void onEvent(Event event) {
        if (event.getType() != EventType.REGISTER) {
            return;
        }

        if (callbackUrl == null || callbackUrl.isBlank()) {
            LOGGER.warning("user-sync-listener skipped: callback URL is not configured");
            return;
        }

        RealmModel realm = session.realms().getRealm(event.getRealmId());
        UserModel user = session.users().getUserById(realm, event.getUserId());

        Map<String, Object> details = new HashMap<>();
        details.put("username", user != null ? user.getUsername() : null);
        details.put("email", user != null ? user.getEmail() : null);
        details.put("first_name", user != null ? user.getFirstName() : null);
        details.put("last_name", user != null ? user.getLastName() : null);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", EVENT_TYPE_REGISTER);
        payload.put("realmId", event.getRealmId());
        payload.put("userId", event.getUserId());
        payload.put("details", details);

        try {
            String body = JsonSerialization.writeValueAsString(payload);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(callbackUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body));

            if (eventSecret != null && !eventSecret.isBlank()) {
                requestBuilder.header("X-Keycloak-Event-Secret", eventSecret);
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();

            if (statusCode < 200 || statusCode >= 300) {
                LOGGER.warning("user-sync-listener callback failed with status " + statusCode + ": " + response.body());
            }
        } catch (IOException | InterruptedException ex) {
            LOGGER.log(Level.SEVERE, "user-sync-listener callback error", ex);
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        // No-op: this listener only handles user REGISTER events.
    }

    @Override
    public void close() {
        // No managed resources to close.
    }
}
