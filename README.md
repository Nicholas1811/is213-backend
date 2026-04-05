<h1 align="center">🍱 JMS — Just Meal Savers</h1>

<p align="center">
  <img src="https://img.shields.io/badge/IS213-Enterprise%20Solution%20Development-1e3a5f?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Group%203-Team%2006-e67e22?style=for-the-badge" />
</p>

<p align="center">
  A microservices-based meal deals marketplace. Sellers list discounted meals; buyers browse, purchase, and earn loyalty points — built on a distributed, event-driven architecture.
</p>

---

## Tech Stack

### Frontend
<p>
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=vue,ts,vite" />
  </a>
</p>

### Backend Services
<p>
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=python,nodejs,ts" />
  </a>
</p>

### Infrastructure & Cloud
<p>
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=docker,postgres,aws,firebase,grafana,prometheus" />
  </a>
</p>
<p>
  <img src="https://img.shields.io/badge/Kong-Gateway-003459?style=flat-square&logo=kong&logoColor=white" />
  <img src="https://img.shields.io/badge/RabbitMQ-Message%20Broker-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" />
  <img src="https://img.shields.io/badge/Keycloak-Auth-4D4D4D?style=flat-square&logo=keycloak&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-AI%20Service-412991?style=flat-square&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Temporal-Workflows-000000?style=flat-square&logo=temporal&logoColor=white" />
</p>

---

## Architecture Overview

```mermaid
graph TD
    Browser["🌐 Browser · localhost:5173"]
    Kong["⚡ Kong API Gateway · localhost:8000"]
    Browser -->|HTTPS| Kong

    subgraph atomic["⚙️ Atomic Services"]
        listing["listing-service\nNode.js · Hono · Drizzle"]
        user["user-service\nPython · FastAPI"]
        payment["payment-service\nPython · Stripe"]
        order["order-service\nPython · Flask"]
        points["points-service\nPython · FastAPI"]
        ai["ai-service\nPython · OpenAI"]
    end

    subgraph composite["🔄 Composite Services"]
        purchase["PurchasedListing-service\nPython · Temporal"]
        refund["Refund-service\nPython · Temporal"]
    end

    Kong --> listing & user & payment & order & points & purchase & refund

    subgraph messaging["📨 Messaging"]
        rabbit[("RabbitMQ")]
        notify["notification-mgmt\nPython · Firebase"]
    end

    listing & order & points & ai & purchase & refund -->|publish| rabbit
    rabbit -->|consume| notify

    subgraph workflows["⏱️ Workflow Engine"]
        temporal["Temporal · localhost:7233"]
    end

    purchase & refund --> temporal

    subgraph auth["🔐 Auth"]
        keycloak["Keycloak · localhost:8081"]
    end

    user --> keycloak

    subgraph database["🗄️ Database"]
        rds[("AWS RDS PostgreSQL\nap-southeast-1")]
    end

    listing & user & payment & order & points & keycloak --> rds
```

> **Convention**: Atomic services are lowercase (`listing-service`). Composite services start with uppercase (`PurchasedListing-service`).

---

## Key Flows

### 1. Product Shopping

```mermaid
sequenceDiagram
    actor Buyer
    participant FE as Frontend
    participant GW as Kong Gateway
    participant LS as listing-service

    Buyer->>FE: Browse meal deals
    FE->>GW: GET /listings
    GW->>LS: Forward request
    LS-->>GW: Return available listings
    GW-->>FE: Listings payload
    FE-->>Buyer: Display meal deals
```

### 2. Purchasing Order

```mermaid
sequenceDiagram
    actor Buyer
    participant FE as Frontend
    participant GW as Kong Gateway
    participant PLS as PurchasedListing-service
    participant TEMP as Temporal
    participant PAY as payment-service
    participant PTS as points-service
    participant MQ as RabbitMQ
    participant NOTIF as notification-mgmt

    Buyer->>FE: Click "Buy"
    FE->>GW: POST /purchase
    GW->>PLS: Forward request
    PLS->>TEMP: Start PurchaseWorkflow
    activate TEMP
    TEMP->>PAY: Charge buyer via Stripe
    PAY-->>TEMP: Payment confirmed
    TEMP->>PTS: Award loyalty points
    PTS-->>TEMP: Points awarded
    deactivate TEMP
    PLS->>MQ: Publish purchase.completed
    MQ-->>NOTIF: Trigger confirmation email
    PLS-->>GW: 201 Created
    GW-->>FE: Order confirmed
    FE-->>Buyer: Show success screen
```

### 3. Canceling Order

```mermaid
sequenceDiagram
    actor Buyer
    participant FE as Frontend
    participant GW as Kong Gateway
    participant RS as Refund-service
    participant TEMP as Temporal
    participant PAY as payment-service
    participant PTS as points-service
    participant MQ as RabbitMQ
    participant NOTIF as notification-mgmt

    Buyer->>FE: Request order cancellation
    FE->>GW: POST /refund
    GW->>RS: Forward request
    RS->>TEMP: Start RefundWorkflow
    activate TEMP
    TEMP->>PAY: Reverse Stripe charge
    PAY-->>TEMP: Reversal confirmed
    TEMP->>PTS: Deduct loyalty points
    PTS-->>TEMP: Points deducted
    deactivate TEMP
    RS->>MQ: Publish refund.processed
    MQ-->>NOTIF: Trigger refund email
    RS-->>GW: 200 OK
    GW-->>FE: Cancellation confirmed
    FE-->>Buyer: Show refund confirmation
```

### 4. Product Listing

```mermaid
sequenceDiagram
    actor Seller
    participant FE as Frontend
    participant GW as Kong Gateway
    participant LS as listing-service

    Seller->>FE: View my listings
    FE->>GW: GET /listings?sellerId={id}
    GW->>LS: Forward request
    LS-->>GW: Return seller listings
    GW-->>FE: Listings payload
    FE-->>Seller: Display active listings
```

### 5. Listing New Products

```mermaid
sequenceDiagram
    actor Seller
    participant FE as Frontend
    participant GW as Kong Gateway
    participant LS as listing-service
    participant MQ as RabbitMQ
    participant AI as ai-service
    participant OAI as OpenAI
    participant NOTIF as notification-mgmt

    Seller->>FE: Submit new listing + photos
    FE->>GW: POST /listings
    GW->>LS: Forward request
    LS->>LS: Save listing as draft
    LS->>MQ: Publish listing.uploaded
    MQ-->>AI: Consume listing.uploaded
    AI->>AI: Screen replay precheck (ML model)
    AI->>OAI: Validate listing images
    OAI-->>AI: Approved / Rejected
    AI->>MQ: Publish listing.processed
    MQ-->>LS: Consume listing.processed
    LS->>LS: Update listing status to active
    LS->>MQ: Publish listing.activated
    MQ-->>NOTIF: Notify seller of result
    FE-->>Seller: Listing live
```

### 6. Cancel Listings

```mermaid
sequenceDiagram
    actor Seller
    participant FE as Frontend
    participant GW as Kong Gateway
    participant LS as listing-service
    participant MQ as RabbitMQ
    participant OS as order-service
    participant RS as Refund-service
    participant TEMP as Temporal
    participant PAY as payment-service
    participant PTS as points-service
    participant NOTIF as notification-mgmt

    Seller->>FE: Cancel listing
    FE->>GW: PATCH /listings/{id}/cancel
    GW->>LS: Forward request
    LS->>LS: Mark listing as cancelled
    LS->>MQ: Publish listing.cancelled
    MQ-->>OS: Consume listing.cancelled
    OS->>OS: Find all PAID orders for listing
    OS->>MQ: Publish refund.batch.requested
    MQ-->>RS: Consume refund batch
    loop For each affected order
        RS->>TEMP: Start RefundWorkflow
        activate TEMP
        TEMP->>PAY: Reverse Stripe charge
        TEMP->>PTS: Deduct loyalty points
        deactivate TEMP
    end
    RS->>MQ: Publish refund.processed (per order)
    MQ-->>NOTIF: Email affected buyers
    LS-->>GW: 200 OK
    GW-->>FE: Listing cancelled
    FE-->>Seller: Confirm cancellation
```

### 7. Clean Plate Challenge

```mermaid
sequenceDiagram
    actor Buyer
    participant FE as Frontend
    participant GW as Kong Gateway
    participant PTS as points-service
    participant MQ as RabbitMQ
    participant AI as ai-service
    participant OAI as OpenAI
    participant NOTIF as notification-mgmt

    Buyer->>FE: Upload before & after meal photos
    FE->>GW: POST /points/verify
    GW->>PTS: Forward request
    PTS->>MQ: Publish points.verification.upload
    MQ-->>AI: Consume verification request
    AI->>AI: Screen replay precheck (ML model)
    Note over AI: Reject if photos are screenshots<br/>or screen recordings of food
    alt Precheck passed
        AI->>OAI: Send before + after images
        OAI-->>AI: approved / rejected + confidence
    end
    AI->>MQ: Publish points.verification.result
    MQ-->>PTS: Consume result
    alt Approved
        PTS->>PTS: Award bonus points to buyer
        PTS->>MQ: Publish points.awarded
        MQ-->>NOTIF: Send points confirmation
        PTS-->>GW: 200 OK — points awarded
    else Rejected
        PTS-->>GW: 200 OK — verification failed
    end
    GW-->>FE: Result
    FE-->>Buyer: Show outcome
```

---

## Prerequisites

| Tool | Min Version | Notes |
|------|-------------|-------|
| ![Docker](https://img.shields.io/badge/Docker-Desktop-2496ED?style=flat-square&logo=docker&logoColor=white) | 24+ | Must be running before starting the backend |
| ![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white) | 18+ | Required for frontend only |
| ![npm](https://img.shields.io/badge/npm-9%2B-CB3837?style=flat-square&logo=npm&logoColor=white) | 9+ | Included with Node.js |

> All backend services run inside Docker. You do **not** need Python or any other runtime installed locally.

---

## Environment Setup

Two `.env` files are required before the app can run.

### 1. Backend — `services/.env`

```env
# ── AWS RDS (PostgreSQL) ─────────────────────────────────────────
AWS_RDS_ENDPOINT=
AWS_RDS_DB_USERNAME=
AWS_RDS_MASTER_PASSWORD=

# ── Listing Service ──────────────────────────────────────────────
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
LISTING_DATABASE_URL=
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_LISTING_EXCHANGE=
RABBITMQ_QUEUE=
RABBITMQ_LISTING_SYNC_EXCHANGE=
RABBITMQ_LISTING_SYNC_ROUTING_KEY=
RABBITMQ_CANCEL_ORDER_EXCHANGE=
RABBITMQ_CANCEL_ORDER_QUEUE=
RABBITMQ_PREFETCH=

# ── Notification Management Service (Firebase) ───────────────────
type=service_account
project_id=
private_key_id=
private_key=
client_email=
client_id=
auth_uri=
token_uri=
auth_provider_x509_cert_url=
client_x509_cert_url=
universe_domain=

# ── User Service ─────────────────────────────────────────────────
KEYCLOAK_BASE_URL=
KEYCLOAK_REALM=
KEYCLOAK_EVENT_SECRET=
USER_DB_HOST=
USER_DB_PORT=5432
USER_DB_NAME=
USER_DB_USER=
USER_DB_PASSWORD=
USER_SERVICE_PORT=

# ── Points Service ───────────────────────────────────────────────
POINT_DATABASE_URL=

# ── Payment Service (Stripe) ─────────────────────────────────────
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYMENT_DB_HOST=
PAYMENT_DB_PORT=5432
PAYMENT_DB_NAME=
PAYMENT_DB_USER=
PAYMENT_DB_PASSWORD=

# ── Order Service ────────────────────────────────────────────────
ORDER_DB_HOST=
ORDER_DB_PORT=5432
ORDER_DB_NAME=
ORDER_DB_USER=
ORDER_DB_PASSWORD=

# ── AI Service ───────────────────────────────────────────────────
OPENAI_API_KEY=
LISTING_EVENTS_EXCHANGE=
AI_EVENTS_EXCHANGE=
LISTING_UPLOADED_ROUTING_KEY=
LISTING_PROCESSED_ROUTING_KEY=

# ── Monitoring ───────────────────────────────────────────────────
GF_SECURITY_ADMIN_PASSWORD=
```

### 2. Frontend — `frontend/.env`

```env
# Firebase
VITE_apiKey=
VITE_authDomain=
VITE_projectId=
VITE_storageBucket=
VITE_messagingSenderId=
VITE_appId=
VITE_measurementId=

# AWS S3
VITE_S3_API_KEY=

# Keycloak
VITE_KEYCLOAK_CLIENT=
VITE_KEYCLOAK_REALM=
VITE_KEYCLOAK_URL=
```

---

## Running the Application

### Step 1 — Start the Backend

Make sure Docker Desktop is open and running.

```bash
cd services
docker compose up --build
```

> First build may take several minutes as all images are pulled and compiled.

To run in the background:

```bash
docker compose up --build -d
```

### Step 2 — Start the Frontend

In a separate terminal:

```bash
cd frontend
npm install       # only needed on first run
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Port Reference

| Service | Badge | URL |
|---------|-------|-----|
| Frontend | ![Vue](https://img.shields.io/badge/Vite-Dev%20Server-646CFF?style=flat-square&logo=vite&logoColor=white) | http://localhost:5173 |
| API Gateway | ![Kong](https://img.shields.io/badge/Kong-Proxy-003459?style=flat-square&logo=kong&logoColor=white) | http://localhost:8000 |
| Kong Admin UI | ![Kong](https://img.shields.io/badge/Kong-Admin-003459?style=flat-square&logo=kong&logoColor=white) | http://localhost:8002 |
| Auth | ![Keycloak](https://img.shields.io/badge/Keycloak-Auth-4D4D4D?style=flat-square&logo=keycloak&logoColor=white) | http://localhost:8081 |
| Message Broker | ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Management-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | http://localhost:15672 |
| Workflows | ![Temporal](https://img.shields.io/badge/Temporal-UI-000000?style=flat-square&logo=temporal&logoColor=white) | http://localhost:8090 |
| Metrics | ![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=flat-square&logo=prometheus&logoColor=white) | http://localhost:9090 |
| Dashboards | ![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800?style=flat-square&logo=grafana&logoColor=white) | http://localhost:3000 |

> Default RabbitMQ credentials: `guest` / `guest`  
> Default Keycloak admin credentials: `admin` / `admin`

---

## Troubleshooting

**Services fail to start on first boot**  
RabbitMQ and Temporal take time to initialise. Services that depend on them will retry automatically. Wait 1–2 minutes and check Docker Desktop logs if they still fail.

**A service keeps restarting**  
Check logs via Docker Desktop or CLI:
```bash
docker compose logs <service-name> --tail=50
```

**Keycloak database connection error**  
Confirm that `AWS_RDS_ENDPOINT`, `AWS_RDS_DB_USERNAME`, and `AWS_RDS_MASTER_PASSWORD` in `services/.env` point to a reachable RDS instance with a `keycloak_esd` database.

**Stripe webhooks not received**  
The `stripe-cli` container forwards webhook events to the payment service. Ensure `STRIPE_SECRET_KEY` is set and your machine has outbound internet access.

**Port conflict**  
If a port is already in use, stop the conflicting process or update the host port mapping in `services/docker-compose.yaml`.

**Full reset** — removes all container state and volumes:
```bash
docker compose down -v
docker compose up --build
```
