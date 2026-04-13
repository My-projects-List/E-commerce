# GitHub Copilot Instructions — Full-Stack E-Commerce Platform

> **Backend:** Java 17 · Spring Boot 3.2.3 · Spring Cloud 2023.0.0 · Maven multi-module  
> **Web frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
> **Mobile:** React Native (Expo SDK 51) · TypeScript · Expo Router  
> **Last updated:** 2026-04-12  
> **Root POM:** `pom.xml` · **Compose:** `docker-compose.yml`

---

## Table of Contents

1. [High-Level Design](#1-high-level-design)
2. [Complete Component Architecture](#2-complete-component-architecture)
3. [ASCII Flowchart — Complete End-to-End](#3-ascii-flowchart--complete-end-to-end)
4. [Key Components](#4-key-components)
5. [Critical Patterns & Best Practices](#5-critical-patterns--best-practices)
6. [Infrastructure Notes](#6-infrastructure-notes)
7. [Integration Points with Other Systems](#7-integration-points-with-other-systems)
8. [Performance Tuning Guidance](#8-performance-tuning-guidance)
9. [Developer Workflows](#9-developer-workflows)
10. [Deployment Order & Dependencies](#10-deployment-order--dependencies)

---

## 1. High-Level Design

### Architecture Summary

The platform is an **event-driven microservices architecture** composed of 11 Spring Boot services communicating via:
- **Synchronous:** Spring Cloud Gateway → Feign clients (service-to-service REST)
- **Asynchronous:** Apache Kafka (event bus for order/payment/notification flows)
- **Caching:** Redis (sessions, cart, product cache, recommendations, rate limiting)
- **Service Discovery:** Netflix Eureka (all services self-register)

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         EXTERNAL CLIENTS                                │
  │              (Browser / Mobile App / Stripe Webhooks)                   │
  └───────────────────────────┬─────────────────────────────────────────────┘
                              │ HTTPS :443 (nginx/LB in prod)
                              ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    API GATEWAY  :8080                                   │
  │  • JWT validation (JwtAuthenticationFilter.java:L1-90)                 │
  │  • Route → lb://{service-name} via Eureka discovery                    │
  │  • Redis rate limiting (100 req/s replenish, 200 burst)                │
  │  • Resilience4j circuit breaker on product-service                     │
  │  • Injects X-User-Id + X-User-Roles headers downstream                │
  └─────────┬──────────┬───────────┬──────────┬────────┬───────────────────┘
            │          │           │          │        │
     ┌──────┴──┐ ┌─────┴──┐ ┌─────┴─┐ ┌──────┴─┐ ┌───┴─────────┐
     │ user    │ │product │ │ cart  │ │ order  │ │  payment    │
     │ :8081   │ │ :8082  │ │ :8083 │ │ :8084  │ │  :8085      │
     └────┬────┘ └────┬───┘ └───┬───┘ └───┬────┘ └─────┬───────┘
          │           │         │          │             │
  ┌───────┴─────┐ ┌───┴──────────────────────────────────────────┐
  │  PostgreSQL  │ │                  Kafka                        │
  │  (4 DBs)    │ │  order.* / payment.* / user.* / inventory.*  │
  └─────────────┘ └──────┬──────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┬────────────┐
            ▼             ▼             ▼            ▼
       notification   search       recommend    order-svc
        :8086         :8087         :8088       (updates)
```

### Why this structure?

| Decision | Reason |
|---|---|
| Separate DB per service | Prevents schema coupling; each service owns its data |
| Kafka for order/payment | At-least-once delivery; manual ACK prevents data loss |
| Redis for cart (no DB) | Cart is ephemeral; recommendation-service also uses Redis sorted sets for weighted user activity scoring |
| Feign for admin reports | Admin aggregates data from multiple services synchronously |
| Gateway-level JWT validation | Services trust `X-User-Id` header — no repeated JWT parsing |

---

## 2. Complete Component Architecture

### Service Map

| Service | Port | Package Root | DB | Cache | Kafka Role |
|---|---|---|---|---|---|
| `api-gateway` | 8080 | `com.ecommerce.gateway` | — | Redis (rate limit) | — |
| `user-service` | 8081 | `com.ecommerce.user` | `users_db` | Redis (tokens) | Producer |
| `product-service` | 8082 | `com.ecommerce.product` | `products_db` | Redis (catalog) | Producer |
| `cart-service` | 8083 | `com.ecommerce.cart` | — | Redis (store) | Producer |
| `order-service` | 8084 | `com.ecommerce.order` | `orders_db` | — | Producer + Consumer |
| `payment-service` | 8085 | `com.ecommerce.payment` | `payments_db` | Redis (idempotency) | Producer |
| `notification-service` | 8086 | `com.ecommerce.notification` | — | — | Consumer only |
| `search-service` | 8087 | `com.ecommerce.search` | Elasticsearch | — | Consumer |
| `recommendation-service` | 8088 | `com.ecommerce.recommendation` | — | Redis | Consumer |
| `admin-service` | 8089 | `com.ecommerce.admin` | — | — | — |
| `common` | lib | `com.ecommerce.common` | — | — | — |

### Common Module — Shared Contracts

All inter-service contracts live in `common/src/main/java/com/ecommerce/common/`:

```
common/
├── dto/
│   ├── ApiResponse.java          # Universal response wrapper (L1-57)
│   │     fields: success, message, data, errorCode, timestamp
│   │     builders: ::success(T), ::success(String,T), ::error(String,String)
│   └── PageResponse.java         # Paginated result wrapper
├── events/
│   ├── OrderEvent.java           # (L1-39) orderId, userId, status, totalAmount
│   │     statuses: CREATED|CONFIRMED|PAYMENT_FAILED|PROCESSING|SHIPPED|DELIVERED|CANCELLED|REFUNDED
│   └── PaymentEvent.java         # (L1-39) paymentId, orderId, amount, status, gatewayTransactionId
│         statuses: INITIATED|SUCCESS|FAILED|REFUNDED|PENDING
├── kafka/
│   └── KafkaTopics.java          # All topic name constants (L1-34)
└── exception/
    ├── EcommerceException.java
    ├── ResourceNotFoundException.java
    └── GlobalExceptionHandler.java
```

### Kafka Topic Registry (`common/kafka/KafkaTopics.java`)

```java
// Order lifecycle
KafkaTopics.ORDER_CREATED          = "order.created"
KafkaTopics.ORDER_CONFIRMED        = "order.confirmed"
KafkaTopics.ORDER_CANCELLED        = "order.cancelled"
KafkaTopics.ORDER_STATUS_UPDATED   = "order.status.updated"

// Payment lifecycle
KafkaTopics.PAYMENT_SUCCESS        = "payment.success"
KafkaTopics.PAYMENT_FAILED         = "payment.failed"
KafkaTopics.PAYMENT_REFUNDED       = "payment.refunded"

// User activity
KafkaTopics.USER_ACTIVITY          = "user.activity"
KafkaTopics.USER_REGISTERED        = "user.registered"

// Notifications
KafkaTopics.NOTIFICATION_EMAIL     = "notification.email"
KafkaTopics.NOTIFICATION_SMS       = "notification.sms"
KafkaTopics.NOTIFICATION_PUSH      = "notification.push"

// Inventory
KafkaTopics.INVENTORY_UPDATED      = "inventory.updated"
KafkaTopics.INVENTORY_LOW_STOCK    = "inventory.low_stock"
```

### Redis Key Schema

```
refresh_token:{userId}          -> JWT string        TTL: 7 days    (user-service)
product:{productId}             -> ProductDto JSON   TTL: 5 min     (product-service)
category:{categoryId}           -> CategoryDto JSON  TTL: 1 hour    (product-service)
cart:{userId}                   -> Cart JSON         TTL: session    (cart-service)
rec:global:popular              -> ZSET<productId>   TTL: none       (recommendation-service)
rec:user:{userId}               -> ZSET<productId>   TTL: 90 days    (recommendation-service)
rec:coview:{productId}          -> ZSET<productId>   TTL: varies     (recommendation-service, reserved for also-viewed)
rate_limit:{userId or IP}       -> token bucket      TTL: rolling    (api-gateway via Redis)
```

### Recommendation Service - Current Behavior

ASCII-only summary of the implemented recommendation logic:

```
Input event: UserActivityEvent { userId, productId, activityType }

Weights:
- PRODUCT_VIEW     -> 1.0
- WISHLIST_ADD     -> 2.0
- CART_ADD         -> 3.0
- REVIEW_SUBMITTED -> 5.0
- PURCHASE         -> 10.0

Writes on each event:
- rec:global:popular           += weight for productId
- rec:user:{userId}            += weight for productId

Read path for GET /api/recommendations:
- if user has fewer than 3 scored products, return rec:global:popular
- else return top products from rec:user:{userId}
- if fewer than requested limit, fill remaining slots from rec:global:popular

Important note:
- This is not full collaborative filtering yet.
- It is an implicit-feedback scoring model based on one user's own interactions.
- There is no similar-user lookup or user-user matrix in the current code.
```

### Database Schemas

**`users_db`** (`user-service/src/main/resources/db/migration/V1__create_users_schema.sql`)
```sql
users          : user_id(UUID PK), email(UNIQUE), password_hash, name, phone_number,
                 role(CUSTOMER|ADMIN|VENDOR), is_active, email_verified, last_login_at
addresses      : address_id(PK), user_id(FK CASCADE), full_name, street, city, state,
                 zip_code, country, phone_number, is_default
user_wishlist  : user_id + product_id (composite PK)
```

**`products_db`** (`product-service/src/main/resources/db/migration/V1__create_product_schema.sql`)
```sql
categories     : category_id(PK), name(UNIQUE), parent_category_id(FK self-ref), is_active
                 Seed: Electronics, Clothing, Home & Garden, Sports & Outdoors, Books
products       : product_id(PK), name, price, original_price(for discounts), category_id(FK),
                 inventory_count, low_stock_threshold, average_rating, review_count,
                 brand, sku(UNIQUE), vendor_id, is_active
product_images : product_id(FK) + image_url
product_attrs  : product_id(FK) + attr_key(composite PK) + attr_value
reviews        : review_id(PK), product_id(FK), user_id, rating(1-5 CHECK),
                 verified_purchase, helpful_count. UNIQUE(product_id, user_id)
```

**`orders_db`** (`order-service/src/main/resources/db/migration/V1__create_orders_schema.sql`)
```sql
orders         : order_id(PK), user_id, user_email, status, subtotal, shipping_cost,
                 discount_amount, total_price, currency(default USD),
                 shipping_{full_name,street,city,state,zip,country} (snapshot),
                 payment_id, tracking_number, idempotency_key(UNIQUE), cancelled_reason
order_items    : order_item_id(PK), order_id(FK), product_id, product_name, sku,
                 unit_price, quantity, line_total
```

**`payments_db`** (`payment-service/src/main/resources/db/migration/V1__create_payments_schema.sql`)
```sql
payments       : payment_id(PK), order_id, user_id, amount, currency(default USD),
                 status, stripe_payment_intent_id, stripe_payment_method_id(tokenized),
                 failure_code, failure_message, retry_count, refund_id
```

---

## 3. ASCII Flowchart — Complete End-to-End

### A. User Registration & Login Flow

```
  Client                 API Gateway :8080             user-service :8081
    │                         │                               │
    │─ POST /api/users/register (public route, no JWT) ──────►│
    │                         │                               │
    │                         │──────────────────────────────►│ UserController.java:L28
    │                         │                               │ validateEmail uniqueness
    │                         │                               │ bcrypt(password)
    │                         │                               │ save User{role=CUSTOMER}
    │                         │                               │ publish USER_REGISTERED
    │                         │                               │   → topic: user.registered
    │                         │                               │
    │◄─ 201 {accessToken, refreshToken, userId} ─────────────┤
    │                                                         │
    │─ POST /api/users/login ────────────────────────────────►│ UserController.java:L44
    │  {email, password}                                      │ bcrypt.matches()
    │                                                         │ JWT.generate(userId, roles)
    │                                                         │ Redis.set(refresh_token:{id})
    │◄─ 200 {accessToken(15m), refreshToken(7d)} ────────────┤
    │
    │  [subsequent requests]
    │─ GET /api/... + Authorization: Bearer {accessToken}
    │                         │
    │                         │ JwtAuthenticationFilter.java:L1-90
    │                         │ JwtUtil.validateToken()
    │                         │ extract userId + roles
    │                         │ add headers:
    │                         │   X-User-Id: {uuid}
    │                         │   X-User-Roles: CUSTOMER
    │                         │
    │                         │──► downstream service (trusts headers)
```

### B. Product Browse & Search Flow

```
  Client              API Gateway           product-service       search-service
    │                     │                     :8082               :8087
    │                     │                       │                   │
    │─GET /api/products?──►│                       │                   │
    │  categoryId=abc      │──────────────────────►│                   │
    │  minPrice=10         │                       │ Redis HIT?        │
    │  maxPrice=100        │                       │ key: product:{id} │
    │  page=0&size=20      │                       │ TTL 5 min         │
    │                      │                       │ MISS→JPA query    │
    │◄─ 200 Page<Product> ─┤◄──────────────────────┤                   │
    │                      │                       │                   │
    │─GET /api/search?q=──►│                       │                   │
    │   shoes&brand=Nike   │───────────────────────────────────────►   │
    │                      │                       │         ES multi_match│
    │                      │                       │         bool filter    │
    │◄─ 200 SearchResult ──┤◄──────────────────────────────────────────┤
    │                      │
    │  [circuit breaker]   │  If product-service fails:
    │                      │  ─► GET /fallback/products
    │                      │  ─► 503 with cached or empty response
```

### C. Complete Checkout & Payment Flow

```
  Client         Gateway       cart      order       product    payment     Kafka
                 :8080         :8083     :8084        :8082      :8085      broker
    │               │            │          │            │          │          │
    │─GET /api/cart►│──────────►│           │            │          │          │
    │               │           │ Redis read│            │          │          │
    │               │           │ cart:{uid}│            │          │          │
    │◄──────────────┤◄──────────┤           │            │          │          │
    │               │            │          │            │          │          │
    │─POST /api/orders/checkout ►│──────────►│            │          │          │
    │  {idempotencyKey, cartId,  │           │ Feign:     │          │          │
    │   shippingAddress,         │           │ getProducts│──────────►          │
    │   paymentMethodId}         │           │ (batch)    │◄─────────┤          │
    │                            │           │ reserve    │          │          │
    │                            │           │ inventory  │──reserve►│          │
    │                            │           │            │◄─OK──────┤          │
    │                            │           │ save Order │          │          │
    │                            │           │ status=    │          │          │
    │                            │           │ CREATED    │          │          │
    │                            │           │            │          │          │
    │                            │           │─────────────────────────────────►│
    │                            │           │   ORDER_CREATED event            │
    │                            │           │   topic: order.created           │
    │                            │           │                                  │
    │─POST /api/payments/process►│───────────────────────────────────►│         │
    │  {orderId, paymentMethodId}│           │            │  Stripe.  │         │
    │                            │           │            │  PaymentIntent      │
    │                            │           │            │  confirm()│         │
    │                            │           │            │           │         │
    │                [Stripe webhook arrives independently]            │         │
    │                            │           │            │  POST /api/payments/webhook
    │                            │           │            │  verify Stripe-Signature
    │                            │           │            │  event: payment_intent.succeeded
    │                            │           │            │           │─────────►
    │                            │           │            │           │  PAYMENT_SUCCESS
    │                            │           │            │           │  topic: payment.success
    │                            │           │◄────────────────────────────────┤
    │                            │    PaymentEventConsumer.java:L23-52         │
    │                            │           │ order.status = CONFIRMED         │
    │                            │           │──────────────────────────────────►
    │                            │           │  ORDER_STATUS_UPDATED             │
    │                            │           │  topic: order.status.updated      │
    │◄─ 200 {orderId, status} ───┤◄──────────┤            │          │          │
    │                            │           │  Feign:    │          │          │
    │                            │           │  clearCart │──────────►          │
    │                            │           │            │ cart-svc  │          │
```

### D. Notification Flow

```
  Kafka                notification-service :8086           SMTP (Gmail)
  broker                        │                               │
    │                           │                               │
    │ ORDER_STATUS_UPDATED ─────►│ OrderEventConsumer.java:L1-56 │
    │ topic: order.status.updated│ @KafkaListener               │
    │ status: CONFIRMED          │ groupId: notification-service-orders
    │                           │ ackMode: MANUAL_IMMEDIATE     │
    │                           │                               │
    │                           │ switch(event.status):         │
    │                           │   CONFIRMED → sendOrderConfirmedEmail()
    │                           │   SHIPPED   → sendShippedEmail()
    │                           │   DELIVERED → sendDeliveredEmail()
    │                           │   CANCELLED → sendCancelledEmail()
    │                           │   PAYMENT_FAILED → sendFailedEmail()
    │                           │   REFUNDED  → sendRefundedEmail()
    │                           │                               │
    │                           │ Thymeleaf render template ────►│
    │                           │ classpath:/templates/*.html   │─► SMTP :587
    │                           │                               │   STARTTLS
    │                           │ ack.acknowledge()             │
    │                           │ (only after email sent)       │
```

### E. Recommendation Flow

```
  Kafka                   recommendation-service :8088          Redis
  broker                            │                             │
    │                               │                             │
    │ USER_ACTIVITY ────────────────►│                             │
    │ topic: user.activity          │ Kafka consumer              │
    │ {userId, productId, action}   │                             │
    │                               │ scoreWeight(activityType)   │
    │                               │ ZINCRBY rec:global:popular  │
    │                               │         weight productId ───►│
    │                               │ ZINCRBY rec:user:{userId}   │
    │                               │         weight productId ───►│
    │                               │ EXPIRE rec:user:{userId}    │
    │                               │         90 days             │
    │                               │                             │
    │                    GET /api/recommendations                  │
    │                    X-User-Id: {userId}                       │
    │                               │ if profile size < 3         │
    │                               │   use rec:global:popular    │
    │                               │ else ZREVRANGE              │
    │                               │   rec:user:{userId} ────────►│
    │                               │◄── List<productId> ─────────┤
    │                               │ pad from rec:global:popular │
    │                               │                             │
    │                    GET /api/recommendations/also-viewed/{productId}
    │                               │ ZREVRANGE                   │
    │                               │ rec:coview:{productId} ─────►│
    │                               │◄── List<productId> ─────────┤
    │                               │ fallback -> global popular  │
```

Notes:
- The current implementation is a weighted per-user ranking model, not full collaborative filtering.
- `rec:coview:{productId}` is read by the API but is not populated anywhere yet.
- The Kafka consumer class exists, but event-consumption wiring is still incomplete.

### F. Admin Report Aggregation Flow

```
  Admin Client       Gateway     admin-service     order-svc   product-svc  user-svc
                     :8080           :8089          :8084        :8082        :8081
    │                  │               │               │            │           │
    │─GET /api/admin/reports           │               │            │           │
    │  ?from=2024-01-01&to=2024-12-31  │               │            │           │
    │  Authorization: Bearer {ADMIN}   │               │            │           │
    │                  │ validate JWT  │               │            │           │
    │                  │ role=ADMIN    │               │            │           │
    │                  │──────────────►│               │            │           │
    │                  │               │ @PreAuthorize │            │           │
    │                  │               │ hasRole(ADMIN)│            │           │
    │                  │               │               │            │           │
    │                  │               │ Feign parallel calls:      │           │
    │                  │               │──────────────►│ countOrders(from,to)   │
    │                  │               │──────────────►│ sumRevenue(from,to)    │
    │                  │               │───────────────────────────►│ countProducts()
    │                  │               │───────────────────────────►│ countLowStock()
    │                  │               │──────────────────────────────────────►│ countNewUsers()
    │                  │               │◄──────────────────────────────────────┤
    │                  │               │ build SalesReportDto       │           │
    │◄── 200 {totalOrders, revenue, avgOrder, newUsers, ...} ───────┤           │
```

---

## 4. Key Components

### API Gateway (`api-gateway/`)

**Critical files:**

| File | Line Range | Purpose |
|---|---|---|
| `filter/JwtAuthenticationFilter.java` | L1–90 | JWT extraction, header injection |
| `util/JwtUtil.java` | L1–56 | JJWT parseSignedClaims, HMAC-SHA256 |
| `src/main/resources/application.yml` | L13–94 | Route definitions, rate limiter, circuit breaker |

**Public routes (no JWT):**
```
/api/users/register, /api/users/login, /api/products (GET),
/api/search/**, /api/reviews (GET), /actuator/**
```

**Protected routes (JWT required → X-User-Id injected):**
```
/api/users/**, /api/cart/**, /api/orders/**, /api/checkout/**,
/api/payments/**, /api/recommendations/**, /api/admin/**
```

**Rate Limiting (application.yml:L95–110):**
- Filter: `name: RequestRateLimiter`
- `redis-rate-limiter.replenishRate: 100`
- `redis-rate-limiter.burstCapacity: 200`

**Circuit Breaker (application.yml:L83–92):**
- `circuitBreaker.name: product-cb`
- `slidingWindowSize: 10`, `failureRateThreshold: 50`
- `waitDurationInOpenState: 10s`
- Fallback: `uri: forward:/fallback/products`

### User Service (`user-service/`)

**JWT config** (`application.yml:L46–51`):
```yaml
jwt:
  secret: ${JWT_SECRET}          # min 32 chars
  access-token-expiry: 900000    # 15 minutes
  refresh-token-expiry: 604800000 # 7 days
```

**Flyway location:** `classpath:db/migration` → `V1__create_users_schema.sql`  
**Trigger:** `updated_at` auto-maintained via PostgreSQL trigger (V1:L45–53)  
**Refresh token storage:** `Redis.set("refresh_token:{userId}", token, TTL=7d)`

### Order Service (`order-service/`)

**Idempotency:** `orders.idempotency_key` is UNIQUE — client must send a UUID per checkout attempt.  
**Transaction boundary:** `OrderServiceImpl` is `@Transactional`; the full checkout (inventory reserve + order create + Kafka publish) is atomic.  
**Kafka consumer ACK mode:** `MANUAL_IMMEDIATE` — `ack.acknowledge()` is called only after order status is persisted (`PaymentEventConsumer.java:L40–52`).

### Payment Service (`payment-service/`)

**Stripe integration:**
- `stripe.secret-key` → `Stripe.apiKey` (set in `@PostConstruct`)  
- `stripe.webhook-secret` → `Webhook.constructEvent(payload, sigHeader, secret)` (`PaymentController.java:L50–77`)  
- Card data is **never stored** — only `stripePaymentIntentId` and `stripePaymentMethodId` tokens.

**Webhook path:** `POST /api/payments/webhook` (no JWT, verified via Stripe signature)

### Search Service (`search-service/`)

- Elasticsearch 8.12 in `discovery.type=single-node`, `xpack.security.enabled=false`
- Spring Data Elasticsearch repository over `ProductSearchDocument`
- Synced from Kafka `inventory.updated` / product events

---

## 5. Critical Patterns & Best Practices

### Pattern 1: ApiResponse Wrapper

Every endpoint returns `ApiResponse<T>`:
```java
// common/dto/ApiResponse.java:L1-57
return ResponseEntity.ok(ApiResponse.success(data));
return ResponseEntity.status(400).body(ApiResponse.error("EMAIL_TAKEN", "Email already registered"));
// Never return raw objects or throw unhandled exceptions to client
```

### Pattern 2: Downstream Header Trust

Services **never parse JWTs themselves**. They read injected headers:
```java
// In any protected controller — example from UserController.java:L56
@GetMapping("/profile")
public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(
        @RequestHeader("X-User-Id") String userId) { ... }
```
Adding a new protected endpoint: ensure the route is listed in `JwtAuthenticationFilter`'s protected routes (L18–35).

### Pattern 3: Kafka Manual ACK

All consumers use `ackMode: MANUAL_IMMEDIATE`. Always acknowledge **after** work completes:
```java
// PaymentEventConsumer.java:L40-52 / OrderEventConsumer.java:L38-55
@KafkaListener(topics = KafkaTopics.PAYMENT_SUCCESS, groupId = "order-service")
public void handlePaymentSuccess(PaymentEvent event, Acknowledgment ack) {
    try {
        orderService.confirmOrder(event.getOrderId());
        ack.acknowledge(); // ← only on success
    } catch (Exception e) {
        log.error("Failed to process payment event", e);
        // no ack → message redelivered
    }
}
```

### Pattern 4: Feign + Circuit Breaker

All inter-service Feign clients have fallback classes:
```java
// cart-service/client/ProductServiceClient.java:L1-28
@FeignClient(name = "product-service", fallback = ProductServiceClientFallback.class)
public interface ProductServiceClient {
    @GetMapping("/api/products/{productId}")
    ApiResponse<ProductSummary> getProduct(@PathVariable String productId);
}
// Fallback returns safe defaults (empty/null), never throws
```

### Pattern 5: Idempotency for Orders

Clients generate a UUID `idempotencyKey` per checkout. If the same key is re-submitted:
```java
// Order entity: @Column(name = "idempotency_key", unique = true)
// OrderServiceImpl: catches DataIntegrityViolationException → returns existing order
```

### Pattern 6: Redis Cache TTLs

```java
// product-service: product cache → 300s, category cache → 3600s
@Cacheable(value = "products", key = "#productId")   // 5 min
@Cacheable(value = "categories", key = "#categoryId") // 1 hr
@CacheEvict(value = "products", key = "#productId")  // on update/delete
```

### Pattern 7: Flyway DB Migrations

- One `V1__create_*_schema.sql` per service
- **Never modify existing migration files** — create `V2__...` for schema changes
- Init script `scripts/init-databases.sql` must run before service first boot (creates 4 DBs)

### Pattern 8: Role Checking

Admin endpoints use `@PreAuthorize` at class level:
```java
// admin-service/controller/AdminController.java:L13
@PreAuthorize("hasRole('ADMIN')")
@RestController
public class AdminController { ... }
// Roles come from X-User-Roles header → Spring Security context
```

---

## 6. Infrastructure Notes

### Startup Order (Docker Compose)

```
Layer 1 (no deps):     zookeeper
Layer 2 (health-gated): postgres, redis, kafka (waits for zookeeper), elasticsearch
Layer 3 (Eureka):       eureka-server (waits for nothing, but other services wait for it)
Layer 4 (DB services):  user-service, product-service, order-service, payment-service
                        (all wait for postgres + kafka + eureka)
Layer 5 (cache-only):   cart-service (redis + eureka)
Layer 6 (event-driven): notification-service, search-service, recommendation-service
                        (kafka + eureka; some need elasticsearch)
Layer 7 (aggregator):   admin-service (eureka only — calls others via Feign)
Layer 8 (edge):         api-gateway (redis + eureka)
```

### Port Reference

```
Eureka        : 8761   PostgreSQL    : 5432
Redis         : 6379   Kafka         : 9092
Zookeeper     : 2181   Elasticsearch : 9200
API Gateway   : 8080   User          : 8081
Product       : 8082   Cart          : 8083
Order         : 8084   Payment       : 8085
Notification  : 8086   Search        : 8087
Recommendation: 8088   Admin         : 8089
```

### Required Environment Variables

```bash
# .env (from .env.example)
JWT_SECRET=<min-32-chars>                  # HMAC-SHA256 key
DB_USER=ecommerce
DB_PASS=ecommerce_secret
STRIPE_SECRET_KEY=sk_live_...             # payment-service
STRIPE_WEBHOOK_SECRET=whsec_...           # payment-service webhook verification
SMTP_HOST=smtp.gmail.com                  # notification-service
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=<app-password>
```

### Volume & Network

```yaml
Network:  ecommerce-net (bridge)
Volumes:  postgres_users_data, redis_data, kafka_data, zookeeper_data, elasticsearch_data
Init SQL: scripts/init-databases.sql  ← mounted to postgres docker-entrypoint-initdb.d/
```

### Database Connection Strings (per service)

```
user-service    → jdbc:postgresql://postgres:5432/users_db
product-service → jdbc:postgresql://postgres:5432/products_db
order-service   → jdbc:postgresql://postgres:5432/orders_db
payment-service → jdbc:postgresql://postgres:5432/payments_db
```

HikariCP pool: `max-pool-size=20, min-idle=5` (user, product, order); `max=15` (payment)

---

## 7. Integration Points with Other Systems

### Stripe (External Payment Gateway)

```
Endpoint:        https://api.stripe.com
SDK version:     com.stripe:stripe-java:24.3.0
Config file:     payment-service/src/main/resources/application.yml:L28-30
Init location:   PaymentServiceImpl @PostConstruct → Stripe.apiKey = secret
Webhook path:    POST /api/payments/webhook (bypasses JWT in gateway)
Verification:    Webhook.constructEvent(body, Stripe-Signature header, webhookSecret)
Events handled:  payment_intent.succeeded → PAYMENT_SUCCESS Kafka event
                 payment_intent.payment_failed → PAYMENT_FAILED Kafka event
```

### SMTP / Email (External)

```
Provider:        Configurable (default: Gmail SMTP)
Config:          notification-service/src/main/resources/application.yml:L7-16
Host:            ${SMTP_HOST:smtp.gmail.com}:${SMTP_PORT:587}
Auth:            STARTTLS with username/password
Templates:       Thymeleaf HTML at classpath:/templates/*.html
Trigger:         OrderEventConsumer consuming order.status.updated topic
```

### Elasticsearch (Internal Infrastructure)

```
Version:         8.12.0 (docker.elastic.co/elasticsearch/elasticsearch:8.12.0)
Mode:            single-node, no security
URI:             http://elasticsearch:9200 (${ELASTICSEARCH_URI})
Index:           products (ProductSearchDocument)
Sync:            search-service Kafka consumer (inventory.updated / product events)
Spring client:   spring-boot-starter-data-elasticsearch
```

### Eureka Service Registry

```
Server:          springcloud/eureka image (port 8761)
Client:          @EnableDiscoveryClient on all services
Gateway routing: lb://user-service, lb://product-service, etc.
Health check:    GET http://eureka-server:8761/actuator/health
```

### Zipkin (Optional Distributed Tracing)

```
Library:         micrometer-tracing-bridge-brave + zipkin-reporter-brave (api-gateway pom)
Endpoint:        Not configured by default — add spring.zipkin.base-url to gateway config
Propagation:     B3 headers forwarded downstream via Brave
```

---

## 8. Performance Tuning Guidance

### Redis

- **Cart TTL:** Set explicit TTL on cart keys to prevent unbounded growth.  
- **Recommendation sorted sets:** Use `ZREMRANGEBYRANK` to cap stored items per user.
- **Product cache invalidation:** `@CacheEvict` must be called on `product-service` update/delete; **not cross-service** — other services reading stale cache will self-heal on TTL expiry.

### PostgreSQL / HikariCP

- **Pool sizing formula:** `max_pool_size = (cores * 2) + effective_disk_spindles`  
- Current: 20 connections per service (review for prod — Postgres default max_connections=100).
- Add `pg_bouncer` in front of Postgres for >5 service replicas.
- **Slow query risk:** `reviews` table joins `products` — ensure index `idx_review_product` exists.

### Kafka

- **Consumer lag:** Monitor `notification-service` and `search-service` consumer groups.  
- **Topic partitions:** Default 1 partition = 1 consumer thread. Increase partitions for parallelism.
- **Retention:** Default 7-day retention is fine; adjust for `user.activity` which can be high-volume.

### Circuit Breaker (Resilience4j on product-service)

- `slidingWindowSize: 10` — opens after 5/10 calls fail. Tune up for high-traffic prod.
- `waitDurationInOpenState: 10s` — half-open probe after 10s.
- Fallback (`/fallback/products`) should return cached catalog or empty list, never error.

### JVM (Dockerfile.template)

```
-XX:+UseContainerSupport         # reads cgroup limits, not host RAM
-XX:MaxRAMPercentage=75.0        # use 75% of container memory for heap
-XX:+UseG1GC                     # G1 for low-pause GC on Java 17
```
Set container `mem_limit` in compose (e.g., `512m` for light services, `1g` for order/product).

### Elasticsearch

- `ES_JAVA_OPTS=-Xms512m -Xmx512m` in docker-compose — increase to 2g for prod index size.
- Product index mapping: set `dynamic: false` and explicit field types to prevent mapping explosion.

---

## 9. Developer Workflows

### Build All Modules

```bash
# From ecommerce-platform/ root
mvn clean package -DskipTests       # fast build
mvn clean verify                    # with tests

# Build single module (e.g., order-service)
mvn clean package -pl order-service -am -DskipTests
# -am: also builds upstream modules (common)
```

### Run Infrastructure Only (dev mode)

```bash
docker-compose up -d postgres redis kafka zookeeper eureka-server elasticsearch
# Services: start individually via IDE or
mvn spring-boot:run -pl user-service
```

### Run Everything

```bash
cp .env.example .env               # fill in Stripe, SMTP, JWT_SECRET
docker-compose up -d               # all 17 containers
docker-compose logs -f user-service order-service payment-service
```

### Add a New Service

1. Create module directory, copy skeleton `pom.xml` from a similar service.
2. Add module entry to root `pom.xml` `<modules>` section.
3. Add service to `docker-compose.yml` with correct `depends_on` and env vars.
4. Register route in `api-gateway/src/main/resources/application.yml`.
5. Add JWT filter rule in `JwtAuthenticationFilter.java` if protected.
6. Create Flyway migration `V1__create_{name}_schema.sql` if service has its own DB.
7. Add DB creation to `scripts/init-databases.sql`.

### Add a New Kafka Consumer

1. Add topic constant to `common/kafka/KafkaTopics.java`.
2. Create `@KafkaListener` in the consuming service with `groupId` specific to that service.
3. Configure `spring.kafka.consumer.properties.spring.json.trusted.packages` to include `com.ecommerce.common.events`.
4. Always use `Acknowledgment` parameter and `MANUAL_IMMEDIATE` ack mode.

### Add a New API Endpoint

1. Add method to controller with `@RequestHeader("X-User-Id") String userId` (if auth needed).
2. If admin-only, add to `AdminController` (already `@PreAuthorize` at class level) or add annotation.
3. If route is new service or path, update gateway `application.yml` routes.
4. Use `ApiResponse.success(data)` as return type.

### Health Checks

```bash
curl http://localhost:8761          # Eureka dashboard
curl http://localhost:8080/actuator/health   # gateway
curl http://localhost:8081/actuator/health   # user-service
curl http://localhost:9200/_cluster/health   # elasticsearch
redis-cli -h localhost ping                  # redis
```

---

## 10. Deployment Order & Dependencies

### Manual Deployment Steps (Bare Metal / VM)

```
Step 1: Infrastructure
─────────────────────
□ Start PostgreSQL 16
□ Run: psql -U ecommerce -f scripts/init-databases.sql
□ Start Redis 7
□ Start Zookeeper → then Kafka (wait for ZK to be ready)
□ Start Elasticsearch 8.12 (single-node, no security)

Step 2: Service Registry
────────────────────────
□ Start eureka-server
□ Wait: GET http://{host}:8761/actuator/health → {"status":"UP"}

Step 3: Core Services (can start in parallel)
─────────────────────────────────────────────
□ Start user-service    (waits for postgres users_db + redis + kafka + eureka)
□ Start product-service (waits for postgres products_db + redis + kafka + eureka)
□ Start order-service   (waits for postgres orders_db + kafka + eureka)
□ Start payment-service (waits for postgres payments_db + kafka + eureka)
  ├── Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET before start
  └── Configure Stripe dashboard webhook URL: https://{domain}/api/payments/webhook

Step 4: Stateless Services (can start in parallel)
───────────────────────────────────────────────────
□ Start cart-service           (waits for redis + eureka)
□ Start notification-service   (waits for kafka + eureka; needs SMTP env vars)
□ Start search-service         (waits for elasticsearch + eureka)
□ Start recommendation-service (waits for redis + kafka + eureka)

Step 5: Aggregator
──────────────────
□ Start admin-service (waits for eureka; calls other services via Feign)

Step 6: Edge
────────────
□ Start api-gateway   (waits for redis + eureka)
  ├── Configure JWT_SECRET (same value as user-service)
  └── Verify: curl http://{host}:8080/actuator/health

Step 7: Validation
──────────────────
□ POST /api/users/register → get JWT
□ GET  /api/products       → products list
□ POST /api/orders/checkout → test order flow
□ Check Eureka dashboard: all services registered
□ Check Kibana or ES: products index has documents
```

### Docker Compose Deployment

```bash
# 1. Prerequisites
cp .env.example .env
# Edit .env: JWT_SECRET, STRIPE_*, SMTP_*

# 2. Build all service images
docker-compose build

# 3. Start infrastructure first (health checks gate service start automatically)
docker-compose up -d

# 4. Monitor startup
docker-compose ps         # check all containers Up
docker-compose logs -f    # watch for startup errors

# 5. Init check
curl http://localhost:8761  # Eureka — all 11 services should appear
curl http://localhost:8080/actuator/health
```

### Kubernetes (Helm / Manifests)

```
Recommended namespace: ecommerce
ConfigMaps:   per-service application.yml overrides
Secrets:      jwt-secret, stripe-secret, db-credentials, smtp-password
Services:     ClusterIP for all internal; LoadBalancer for api-gateway only
Ingress:      Route *.yourdomain.com → api-gateway:8080
Readiness:    /actuator/health (all services expose it)
HPA:          product-service and order-service (CPU target 70%)
PVC:          postgres, redis, kafka, elasticsearch data volumes
Init containers: Wait for postgres ready before user/product/order/payment services
```

---

---

## 11. Full-Stack Frontend Architecture

### Repository Layout

```
ecommerce-platform/
├── shared/types/index.ts         ← Single source of truth for all TypeScript types
│                                   (mirrors Java DTOs from common/ module)
├── frontend/                     ← Next.js 14 web app (port 3000)
│   ├── app/
│   │   ├── (store)/              ← Customer storefront route group
│   │   │   ├── page.tsx          ← Home: hero, categories, featured products
│   │   │   ├── products/
│   │   │   │   ├── page.tsx      ← Catalog: filter panel + paginated grid
│   │   │   │   └── [id]/page.tsx ← Product detail: images, reviews, add-to-cart
│   │   │   ├── cart/page.tsx     ← Full cart view (CartSidebar is the drawer)
│   │   │   ├── checkout/page.tsx ← 3-step: address → payment → review
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx      ← Order history list
│   │   │   │   └── [id]/page.tsx ← Order detail + progress tracker (polls every 30s)
│   │   │   └── profile/page.tsx  ← Tabbed: profile / addresses / wishlist
│   │   ├── (admin)/admin/        ← Admin dashboard route group (ADMIN role only)
│   │   │   ├── layout.tsx        ← Sidebar layout with role guard
│   │   │   ├── page.tsx          ← Dashboard: stat cards + Recharts charts
│   │   │   ├── products/page.tsx ← Product table + discount modal
│   │   │   ├── orders/page.tsx   ← Orders table + status filter tabs
│   │   │   └── reports/page.tsx  ← Date-range reports + revenue chart
│   │   ├── auth/
│   │   │   ├── login/page.tsx    ← Email/password login → JWT → Zustand
│   │   │   └── register/page.tsx ← Registration + password strength meter
│   │   ├── layout.tsx            ← Root layout: Providers (React Query + ThemeProvider)
│   │   └── globals.css           ← CSS custom properties (shadcn/ui design tokens)
│   ├── components/
│   │   ├── providers.tsx         ← React Query + next-themes wrappers
│   │   └── store/
│   │       ├── Navbar.tsx        ← Sticky nav: search, cart badge, user dropdown
│   │       ├── CartSidebar.tsx   ← Slide-over cart drawer (opens from any page)
│   │       ├── ProductCard.tsx   ← Card with optimistic add-to-cart, wishlist toggle
│   │       └── FeaturedProducts.tsx
│   ├── lib/
│   │   ├── api.ts                ← Axios client; auto-refresh on 401; all API methods
│   │   ├── store.ts              ← Zustand: useAuthStore, useCartStore, useUIStore
│   │   └── utils.ts             ← cn(), formatCurrency(), formatDate(), etc.
│   ├── middleware.ts             ← Next.js middleware: JWT cookie → redirect on :401
│   ├── Dockerfile               ← Multi-stage: deps → builder → runner (standalone)
│   └── next.config.ts           ← output: 'standalone', /api/* rewrite → gateway
│
└── mobile/                       ← React Native Expo app (iOS + Android)
    ├── app/
    │   ├── _layout.tsx           ← Root: QueryClient + GestureHandler + Toast
    │   ├── (tabs)/
    │   │   ├── _layout.tsx       ← Bottom tabs: Home / Search / Cart / Profile
    │   │   ├── index.tsx         ← Home: hero banner, category pills, top-rated grid
    │   │   ├── search.tsx        ← Search bar → productApi.search → FlashList grid
    │   │   ├── cart.tsx          ← Cart list, qty controls, checkout CTA
    │   │   └── profile.tsx       ← Auth gate → profile, orders link, logout
    │   ├── product/[id].tsx      ← Image carousel, specs, reviews, sticky add-to-cart
    │   ├── auth/
    │   │   ├── login.tsx         ← Email/pw form → AsyncStorage tokens
    │   │   └── register.tsx      ← Registration + pw strength bars
    │   ├── checkout.tsx          ← 3-step checkout (address → payment → review)
    │   └── orders/
    │       ├── index.tsx         ← Order list
    │       └── [id].tsx          ← Order detail + progress dots, cancel button
    ├── lib/
    │   ├── api.ts                ← Mirrors frontend/lib/api.ts; uses AsyncStorage
    │   └── store.ts              ← Zustand: useAuthStore, useCartStore
    ├── app.json                  ← Expo config: bundleId, icons, EAS project ID
    └── babel.config.js           ← expo, reanimated, module-resolver plugins
```

### Key Frontend Patterns

**Shared types — single source of truth**
```typescript
// shared/types/index.ts — import in both frontend and mobile:
import type { Product, Cart, Order } from '../../shared/types';
// Never duplicate type definitions between web and mobile.
```

**API client pattern (identical shape in web + mobile)**
```typescript
// All methods return the unwrapped T from ApiResponse<T>
// frontend/lib/api.ts — browser (localStorage tokens)
// mobile/lib/api.ts   — React Native (AsyncStorage tokens)
const products = await productApi.list({ categoryId: 'electronics', page: 0 });
const cart     = await cartApi.addItem({ productId: id, quantity: 1 });
```

**Auth flow (web)**
```
Login → authApi.login() → tokens → useAuthStore.setAuth()
                                  → tokenStorage.setTokens() (localStorage)
                                  → router.push('/') or '/admin'
Protected page → middleware.ts reads cookie → redirect if missing
Expired token  → axios interceptor auto-calls /api/users/refresh-token
```

**Auth flow (mobile)**
```
Login → authApi.login() → tokens → useAuthStore.setAuth()
                                  → tokenStorage.setTokens() (AsyncStorage)
                                  → router.replace('/(tabs)/index')
```

**React Query key conventions**
```typescript
['products', filters]         // product list — invalidated on filter change
['product', productId]        // single product detail
['cart']                      // user's cart — invalidated after add/remove/update
['orders']                    // order list
['order', orderId]            // single order — refetchInterval: 30_000
['admin', 'dashboard']        // admin stats — refetchInterval: 300_000
['profile']                   // user profile
['wishlist']                  // wishlist product IDs
```

**Zustand stores**
```typescript
useAuthStore  → { user, tokens, isAuthenticated, isAdmin, setAuth, logout }
useCartStore  → { cart, isOpen, setCart, openCart, closeCart }
useUIStore    → { searchQuery, setSearchQuery }
```

**Admin route guard (two layers)**
1. `middleware.ts` — decodes JWT cookie, redirects non-ADMIN away from `/admin/*`
2. `(admin)/admin/layout.tsx` — `useAuthStore().isAdmin` check → renders "Access Denied"

### Frontend → Backend Data Flow

```
  Browser / Expo app
       │
       │  All requests to /api/* (web: via Next.js rewrite, mobile: direct)
       ▼
  API Gateway :8080  ──── JWT validated ──── X-User-Id injected
       │
       ├── /api/users/**        → user-service     :8081
       ├── /api/products/**     → product-service  :8082  (circuit breaker)
       ├── /api/cart/**         → cart-service     :8083
       ├── /api/orders/**       → order-service    :8084
       ├── /api/checkout/**     → order-service    :8084
       ├── /api/payments/**     → payment-service  :8085
       ├── /api/search/**       → search-service   :8087
       ├── /api/recommendations/**→recommendation-service :8088
       └── /api/admin/**        → admin-service    :8089
```

### Port Reference (Complete — all layers)

```
Next.js frontend   : 3000   (http://localhost:3000)
Spring API Gateway : 8080   (http://localhost:8080)
Eureka dashboard   : 8761   (http://localhost:8761)
user-service       : 8081
product-service    : 8082
cart-service       : 8083
order-service      : 8084
payment-service    : 8085
notification-svc   : 8086
search-service     : 8087
recommendation-svc : 8088
admin-service      : 8089
PostgreSQL         : 5432
Redis              : 6379
Kafka              : 9092
Elasticsearch      : 9200
```

### Developer Workflows — Frontend

```bash
# ── Next.js web app ─────────────────────────────────────────
cd frontend
cp .env.local.example .env.local          # fill in STRIPE key, NEXTAUTH_SECRET
npm install
npm run dev                               # http://localhost:3000

# ── Mobile (Expo) ────────────────────────────────────────────
cd mobile
npm install
npx expo start                            # QR code for Expo Go
npx expo start --ios                      # iOS simulator
npx expo start --android                  # Android emulator

# ── Run everything together ──────────────────────────────────
# In repo root:
cp .env.example .env                      # fill in all secrets
docker-compose up -d                      # backend + frontend container
# Access: http://localhost:3000 (web), http://localhost:8080 (API)

# ── Add a new frontend page ──────────────────────────────────
# 1. Create app/(store)/new-page/page.tsx
# 2. Add API call in lib/api.ts if needed
# 3. Add types to shared/types/index.ts
# 4. Add mobile equivalent in mobile/app/new-page.tsx

# ── Type checking ────────────────────────────────────────────
cd frontend && npm run type-check
```

### Environment Variables — Frontend

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080     # Spring Cloud Gateway
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_  # Stripe public key (safe to expose)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-char-string>

# In Docker (docker-compose.yml frontend service):
NEXT_PUBLIC_API_URL=http://api-gateway:8080   # internal docker network name
```

### Checkout Flow — Frontend Detail

```
User clicks "Proceed to Checkout"
  │
  ├─ Step 1: Address
  │    GET /api/users/addresses  → list saved addresses
  │    User selects one → selectedAddressId stored in component state
  │
  ├─ Step 2: Payment
  │    In production: render <Stripe Elements> CardElement
  │    stripe.createPaymentMethod() → paymentMethodId (pm_...)
  │    In dev/test: manually paste a Stripe test token
  │
  ├─ Step 3: Review + Place Order
  │    POST /api/orders/checkout  { idempotencyKey, shippingAddressId, paymentMethodId }
  │    → order-service creates Order (status: CREATED)
  │    → publishes ORDER_CREATED to Kafka
  │
  │    POST /api/payments/process { orderId, paymentMethodId }
  │    → payment-service calls Stripe API
  │    → Stripe webhook fires → POST /api/payments/webhook
  │    → PaymentEvent published to Kafka
  │
  └─ Order status updates via:
       • Web: useQuery refetchInterval: 30_000 on /orders/[id]
       • Mobile: same refetchInterval on orders/[id].tsx
```

*Generated from codebase analysis — update this file when adding services, topics, or infrastructure components.*
