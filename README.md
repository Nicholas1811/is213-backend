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

```
Browser (localhost:5173)
        │
        ▼
Kong API Gateway (localhost:8000)
        │
        ├── listing-service          Node.js · TypeScript · Hono · Drizzle ORM
        ├── user-service             Python 3.12 · FastAPI
        ├── payment-service          Python 3.12 · Stripe
        ├── order-service            Python 3.12
        ├── points-service           Python 3.12
        ├── ai-service               Python 3.11 · OpenAI
        ├── CreateListing-service    Python  [Composite]
        ├── PurchasedListing-service Python · Temporal  [Composite]
        └── Refund-service           Python · Temporal  [Composite]

Supporting Infrastructure
        ├── Keycloak               Auth server         (localhost:8081)
        ├── RabbitMQ               Message broker      (localhost:15672 UI)
        ├── Temporal               Workflow engine     (localhost:7233)
        ├── Temporal UI                                (localhost:8090)
        ├── Stripe CLI             Webhook forwarder
        ├── Prometheus             Metrics scraper     (localhost:9090)
        └── Grafana                Monitoring UI       (localhost:3000)

Database: AWS RDS PostgreSQL (external, ap-southeast-1)
```

> **Convention**: Atomic services are lowercase (`listing-service`). Composite services start with uppercase (`CreateListing-service`).

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
