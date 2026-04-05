# JMS — Just Meal Savers

> IS213 Enterprise Solution Development | Group 3, Team 06

A microservices-based meal deals marketplace platform. Sellers list discounted meals; buyers browse, purchase, and earn loyalty points — all backed by a distributed, event-driven architecture.

---

## Architecture Overview

```
Browser (localhost:5173)
        │
        ▼
Kong API Gateway (localhost:8000)
        │
        ├── listing-service        (Node.js/TypeScript · Hono · Drizzle ORM)
        ├── user-service           (Python 3.12 · FastAPI)
        ├── payment-service        (Python 3.12 · Stripe)
        ├── order-service          (Python 3.12 · Flask)
        ├── points-service         (Python 3.12 · FastAPI)
        ├── ai-service             (Python 3.11 · OpenAI)
        ├── PurchasedListing-service (Python · Temporal · Composite)
        └── Refund-service         (Python · Temporal · Composite)

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

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | Must be running before starting backend |
| [Node.js](https://nodejs.org/) | 18+ | Required for frontend only |
| npm | 9+ | Included with Node.js |

> All backend services run inside Docker. You do **not** need Python, Java, or any other runtime installed locally.

---

## Environment Setup

The application requires two `.env` files — one for the backend services and one for the frontend.

### 1. Backend `.env`

Place this file at `services/.env`. Fill in all values before starting Docker.

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

### 2. Frontend `.env`

Place this file at `frontend/.env`.

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

This will start all backend services, the API gateway, message broker, Temporal, and monitoring stack. First build may take several minutes.

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

The frontend will be available at **http://localhost:5173**.

---

## Port Reference

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway (Kong) | http://localhost:8000 |
| Kong Admin UI | http://localhost:8002 |
| Keycloak (Auth) | http://localhost:8081 |
| RabbitMQ Management UI | http://localhost:15672 |
| Temporal UI | http://localhost:8090 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

> Default RabbitMQ credentials: `guest` / `guest`  
> Default Keycloak admin credentials: `admin` / `admin`

---

## Troubleshooting

**Services fail to start on first boot**  
RabbitMQ and Temporal take time to initialise. Services that depend on them will retry automatically. Wait 1–2 minutes and check Docker Desktop logs if they still fail.

**A service keeps restarting**  
Check the logs in Docker Desktop or via CLI:
```bash
docker compose logs <service-name> --tail=50
```

**Keycloak database connection error**  
Confirm that `AWS_RDS_ENDPOINT`, `AWS_RDS_DB_USERNAME`, and `AWS_RDS_MASTER_PASSWORD` in `services/.env` point to a reachable RDS instance with a `keycloak_esd` database.

**Stripe webhooks not received**  
The `stripe-cli` container forwards webhook events from Stripe to the payment service. Ensure `STRIPE_SECRET_KEY` is set and your machine has outbound internet access.

**Port conflict**  
If a port is already in use (e.g. 5432, 8080), stop the conflicting process or update the host port mapping in `services/docker-compose.yaml`.

**Full reset** (removes all container state):
```bash
docker compose down -v
docker compose up --build
```
