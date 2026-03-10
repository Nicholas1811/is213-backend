FROM maven:3.9.9-eclipse-temurin-21 AS provider-builder
WORKDIR /workspace

# Build the Keycloak listener provider jar during image build.
COPY keycloak-user-sync-listener /workspace/keycloak-user-sync-listener
RUN mvn -f /workspace/keycloak-user-sync-listener/pom.xml -DskipTests package

FROM quay.io/keycloak/keycloak:26.5.2
COPY --from=provider-builder /workspace/keycloak-user-sync-listener/target/keycloak-user-sync-listener-1.0.0.jar /opt/keycloak/providers/
RUN /opt/keycloak/bin/kc.sh build
