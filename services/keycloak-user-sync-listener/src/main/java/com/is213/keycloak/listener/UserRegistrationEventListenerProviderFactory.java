package com.is213.keycloak.listener;

import java.time.Duration;
import java.util.logging.Logger;
import org.keycloak.Config;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

public class UserRegistrationEventListenerProviderFactory implements EventListenerProviderFactory {

    public static final String ID = "user-sync-listener";
    private static final Logger LOGGER = Logger.getLogger(UserRegistrationEventListenerProviderFactory.class.getName());

    private String callbackUrl;
    private String eventSecret;
    private Duration timeout;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new UserRegistrationEventListenerProvider(session, callbackUrl, eventSecret, timeout);
    }

    @Override
    public void init(Config.Scope config) {
        this.callbackUrl = firstNonBlank(
                config.get("callback-url"),
                config.get("callbackUrl"),
                System.getenv("KEYCLOAK_EVENT_CALLBACK_URL")
        );
        this.eventSecret = firstNonBlank(
                config.get("event-secret"),
                config.get("eventSecret"),
                System.getenv("KEYCLOAK_EVENT_SECRET")
        );

        int timeoutMs = 5000;
        String timeoutConfig = firstNonBlank(
                config.get("timeout-ms"),
                config.get("timeoutMs"),
                System.getenv("KEYCLOAK_EVENT_TIMEOUT_MS")
        );
        if (timeoutConfig != null && !timeoutConfig.isBlank()) {
            timeoutMs = Integer.parseInt(timeoutConfig);
        }
        this.timeout = Duration.ofMillis(timeoutMs);

        LOGGER.info("user-sync-listener initialized with callbackUrl=" + callbackUrl + ", timeoutMs=" + timeoutMs);
        if (eventSecret == null || eventSecret.isBlank()) {
            LOGGER.warning("user-sync-listener initialized without event secret; callback auth header will not be sent");
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-init behavior required.
    }

    @Override
    public void close() {
        // No managed resources to close.
    }

    @Override
    public String getId() {
        return ID;
    }
}
