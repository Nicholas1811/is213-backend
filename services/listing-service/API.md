# jms-productservice API

Product/listings microservice for JMS (Job Meal Service). Built with Hono + Drizzle ORM + PostgreSQL + RabbitMQ.

Base URL: `http://localhost:9999`

---

## Listing Object

```json
{
  "id": 1,
  "imageUrl": "https://bucket.s3.amazonaws.com/listings/abc.jpg",
  "name": "Chicken Rice",
  "description": "Hainanese chicken rice with soup",
  "qty": 50,
  "unitPriceCents": 450,
  "status": "active",
  "bestBefore": "2025-03-26T12:00:00Z",
  "createdAt": "2025-03-25T08:00:00Z",
  "updatedAt": "2025-03-25T08:00:00Z"
}
```

### Status Flow

```
created → processed → active → sold_out
                     ↘ cancelled
```

| Status | Meaning |
|--------|---------|
| `created` | Default on creation, waiting for AI processing |
| `processed` | AI has processed the listing |
| `active` | Visible to customers, can be purchased |
| `sold_out` | Quantity hit 0 |
| `cancelled` | Manually cancelled by the company |

---

## Endpoints

### GET /listings

List all listings. Optionally filter by status.

**Query params**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `created \| processed \| active \| sold_out \| cancelled` | No | Filter by listing status |

**Response 200**
```json
[
  { "id": 1, "imageUrl": "https://...", "name": "Chicken Rice", "qty": 50, "status": "active", ... },
  { "id": 2, "imageUrl": "https://...", "name": "Nasi Lemak", "qty": 0, "status": "sold_out", ... }
]
```

---

### POST /listings

Batch create listings from a list of image URLs. Frontend uploads images to S3 directly, then calls this with the resulting URLs. Each listing is inserted with only the image URL and default status `created`. A `listing.uploaded` event is fired per listing for the AI service to consume and fill in the details via PATCH later.

Max 50 URLs per request.

**Request body**

```json
{
  "imageUrls": [
    "https://bucket.s3.amazonaws.com/listings/abc.jpg",
    "https://bucket.s3.amazonaws.com/listings/def.jpg"
  ]
}
```

**Response 200** — array of created listing objects (name, description, qty, etc. will be null until AI processes them)

```json
[
  { "id": 1, "imageUrl": "https://...", "name": null, "qty": 0, "status": "created", ... },
  { "id": 2, "imageUrl": "https://...", "name": null, "qty": 0, "status": "created", ... }
]
```

---

### GET /listings/:id

Get a single listing by ID.

**Response 200** — the listing object

**Response 404**
```json
{ "message": "Not Found" }
```

---

### PATCH /listings/:id

Partially update a listing. Used by the AI service to populate listing details after processing.

**Request body** (all fields optional)

```json
{
  "imageUrl": "https://...",
  "name": "Chicken Rice",
  "description": "Hainanese chicken rice with soup",
  "qty": 50,
  "unitPriceCents": 450,
  "bestBefore": "2025-03-26T12:00:00Z",
  "status": "active"
}
```

**Response 200** — the updated listing object

**Response 404**
```json
{ "message": "Not Found" }
```

---

### DELETE /listings/:id

Delete a listing by ID.

**Response 204** — no body

**Response 404**
```json
{ "message": "Not Found" }
```

---

### POST /listings/:id/purchase

Decrease the quantity of a listing by `qty`. Only works if the listing is `active` and has enough stock. Automatically transitions to `sold_out` if qty hits 0 after the purchase.

**Request body**

```json
{ "qty": 5 }
```

**Response 200** — the updated listing object

**Response 404** — listing not found

**Response 409** — listing is not active or doesn't have enough quantity
```json
{ "message": "Listing does not have enough quantity or not active" }
```

---

### POST /listings/:id/restock

Increase the quantity of a listing by `qty`. Only works if the listing is `active` or `sold_out`. Automatically transitions back to `active` if it was `sold_out`.

**Request body**

```json
{ "qty": 20 }
```

**Response 200** — the updated listing object

**Response 404** — listing not found

**Response 409** — listing is not in a restockable state
```json
{ "message": "Listing is neither active nor sold_out" }
```

---

### POST /listings/:id/cancel

Cancel a listing. Sets status to `cancelled`.

**Response 200** — the updated listing object

**Response 404** — listing not found

---

## Events (RabbitMQ)

### Published

| Event | Trigger |
|-------|---------|
| `listing.uploaded` | After `POST /listings` — one event per listing, AI service consumes this to process the image and populate the listing details |

### Consumed (internal — via `syncListingFromEvent`)

| Event | Action |
|-------|--------|
| `listing.processed` | AI finishes processing — updates listing fields (name, description, qty, price, status, bestBefore) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `9999` | Port to listen on |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `LOG_LEVEL` | `info` | Pino log level |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection URL |
| `RABBITMQ_EXCHANGE` | `dev.events` | Exchange name |
| `RABBITMQ_QUEUE` | `dev.listings.events` | Queue name |
| `RABBITMQ_PREFETCH` | `20` | Max unacked messages |
